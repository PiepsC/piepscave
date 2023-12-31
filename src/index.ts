import m, { Vnode } from "mithril";
import {createProgram, createShader, resizeCanvasToDisplaySize, setGeometry, setColors, m4, setRectangleVert, setRectangleUV} from "./glUtilities";
import {Timer, Rectangle, CubeAnimation, ToggleBoolean} from "./objects";
import BezierEasing from "bezier-easing";
import {parse, marked} from "marked";

let refHeight = 1080; //Reference screen height
let resizeRatio = 1;

// Constants
const hoverHeight = 50;
const boxOffset = 250;
const infoBoxOffset = 70;
const totalDepth = 10000;
const initialRot = Math.PI / 4
const maxMouseRot = Math.PI / 22
const boxSize = 320;
//Ripple effect parameters
const baseRadius = 100;
const thickness = 38;
const speedUp = 5.5;
const dissipateSpeed = 7;
// Animation parameters
const animBoundary = 150;
const weirdOffset = 32;
const BlogResize = 7.5;
const SlowRotation = 0.007;
//Colors
const lightGrey = "#969696" // Encoding of the background color in hex. This corresponds to (70,70,70)

// Hacks
let animOffset = 0; // On a route we want to instantly complete the animation interpolation
let animation = 0; // Animation index
let then = 0; // Used for deltatime
let menuButtons : HTMLButtonElement[] = [] // Save the current menu buttons for animation related things
let mainBoxScale = boxSize/Math.sqrt(2 * Math.pow(boxSize, 2))
let fullBoxDiff = 1.0 - mainBoxScale
// Used for transitions
let bool1 = new ToggleBoolean(false), bool2 = new ToggleBoolean(false), bool3 = new ToggleBoolean(false);
// For main page
let iconDiv, optionDiv, copyDiv;
// For blog page
let blogDiv, ratingDiv, thumbDiv;
// For about page
let abstractDiv, infoDiv;
// For mouse tracking
let mousex;

// Menu routes. Others are dynamic, depending on the available files. Format (title, icon, animation, route)
const menuRoutes = [
    ["Reviews", "fa-pencil", 1, "#!/reviews"],
    ["Creative", "fa-dice", 2, "#!/creative"],
    ["About", "fa-graduation-cap", 3, "#!/about"]
]
const copyRight = " 2023-2024 Lars Willemsen"

// Section we alter with Mithriljs
let start = document.querySelector("#dynamic")
let canvas = <HTMLCanvasElement>document.querySelector("#glCanvas")
let gl = <WebGL2RenderingContext>canvas.getContext("webgl")
let vertexShaderSource  = (<HTMLScriptElement>document.querySelector("#vertex-shader-2d")).text;
let fragmentShaderSource  = (<HTMLScriptElement>document.querySelector("#fragment-shader-2d")).text;
let postProcessingFragSource  = (<HTMLScriptElement>document.querySelector("#postprocessing-fragment-shader-2d")).text;
let postProcessingVertSource  = (<HTMLScriptElement>document.querySelector("#postprocessing-vertex-shader-2d")).text;
let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
let postProcessingFragShader = createShader(gl, gl.FRAGMENT_SHADER, postProcessingFragSource);
let postProcessingVertShader = createShader(gl, gl.VERTEX_SHADER, postProcessingVertSource);
let program = createProgram(gl, vertexShader, fragmentShader);
let pp_program = createProgram(gl, postProcessingVertShader, postProcessingFragShader);
// let pprogram = createProgram(gl, postProcessingVertShader, fragmentShader);

let rectangle = new Rectangle(10, boxSize, [150, 150, 150, 255], [70, 70, 70, 200], [200, 200, 200, 255]);

// Get attribute location 
let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
let colorAttributeLocation = gl.getAttribLocation(program, "a_color");
let pp_positionAttributeLocation = gl.getAttribLocation(pp_program, "a_position");
let pp_uvAttributeLocation = gl.getAttribLocation(pp_program, "a_texCoord");
// Get uniform location
let matrixAttributeLocation = gl.getUniformLocation(program, "u_matrix");
let timeAttributeLocation = gl.getUniformLocation(pp_program, "u_time");
let radiusAttributeLocation = gl.getUniformLocation(pp_program, "u_radius");
let thicknessAttributeLocation = gl.getUniformLocation(pp_program, "u_thickness");
let centerAttributeLocation = gl.getUniformLocation(pp_program, "u_center");
let resolutionAttributeLocation = gl.getUniformLocation(pp_program, "u_resolution");
let dissipateAttributeLocation = gl.getUniformLocation(pp_program, "u_dissipate");

let pp_positionBuffer = gl.createBuffer();
let pp_uvBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pp_uvBuffer);
setRectangleUV(gl);

let positionBuffer = gl.createBuffer();
// Note: bindbuffer is like a "select"
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectangle.getVerts()), gl.STATIC_DRAW);

let colorBuffer = gl.createBuffer();
// Note: bindbuffer is like a "select"
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(rectangle.getColors()), gl.STATIC_DRAW);

let postBuffer = gl.createTexture();
let postDepthBuffer = gl.createRenderbuffer();
let frameBuffer = gl.createFramebuffer();

// let rot = 0, then = 0, animation = 0;
let hTimer = new Timer(0, 0.6, 1);
let aTimer = new Timer(0, 0.8);
// let hTimer = new Timer(0, 0.3, 1);
let fTimer = new Timer(0, 10, 1);
let pTimer = new Timer(0, 1);

let easing = BezierEasing(0.65, 0, .35, 1);

function postProcessing(time, ratio, center)
{

    gl.bindBuffer(gl.ARRAY_BUFFER, pp_positionBuffer);
    setRectangleVert(gl, 0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(pp_program);

    gl.uniform1f(timeAttributeLocation, time * speedUp);
    gl.uniform1f(dissipateAttributeLocation, dissipateSpeed * ratio);
    gl.uniform1f(radiusAttributeLocation, baseRadius * ratio);
    gl.uniform1f(thicknessAttributeLocation, thickness * ratio);
    gl.uniform2f(centerAttributeLocation, center[0], center[1] + gl.canvas.height / 2 - weirdOffset * ratio);
    gl.uniform2f(resolutionAttributeLocation, gl.canvas.width, gl.canvas.height);
    
    gl.enableVertexAttribArray(pp_positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, pp_positionBuffer);
    var size = 2;          // 2 components per iteration
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    // This BINDS the buffer selected by bindBuffer permanently! Always call bindBuffer before this
    gl.vertexAttribPointer(pp_positionAttributeLocation, size, gl.FLOAT, normalize, stride, offset)

    gl.enableVertexAttribArray(pp_uvAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, pp_uvBuffer);
    var size = 2;          // 2 components per iteration
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    // This BINDS the buffer selected by bindBuffer permanently! Always call bindBuffer before this
    gl.vertexAttribPointer(pp_uvAttributeLocation, size, gl.FLOAT, normalize, stride, offset)

    // Draw from the framebuffer into the quad
    gl.bindTexture(gl.TEXTURE_2D, postBuffer);

    // Render to the backbuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
function drawScene(now)
{
    now *= 0.001;
    var deltaTime = now - then;
    then = now;

    // Part for timers
    hTimer.tick(deltaTime);
    fTimer.tick(deltaTime);
    if(fTimer.flip && (animation < 4 || animation == 5) && document.hasFocus())
        rectangle.activateNext();

    resizeCanvasToDisplaySize(<HTMLCanvasElement>gl.canvas);
    resizeRatio = gl.canvas.height / refHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(70/255, 70/255, 70/255, 1);

    gl.useProgram(program);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    var size = 3;          // 3 components per iteration
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    // This BINDS the buffer selected by bindBuffer permanently! Always call bindBuffer before this
    gl.vertexAttribPointer(positionAttributeLocation, size, gl.FLOAT, normalize, stride, offset)
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(rectangle.getColors()), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    var size = 4;          // 4 components per iteration
    var normalize = true; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    // This BINDS the buffer selected by bindBuffer permanently! Always call bindBuffer before this
    gl.vertexAttribPointer(colorAttributeLocation, size, gl.UNSIGNED_BYTE, normalize, stride, offset);

    let matrix = m4.orthographic((<HTMLCanvasElement>gl.canvas).clientWidth, (<HTMLCanvasElement>gl.canvas).clientHeight, totalDepth / 2, -totalDepth / 2);
    let boxStart = [gl.canvas.width / 2, gl.canvas.height / 2 - boxOffset * resizeRatio]
    let newBoxSize = boxSize * resizeRatio;

    if(iconDiv)
    {
        iconDiv.style.left = `${boxStart[0] - newBoxSize / 2}px`
        iconDiv.style.top = `${boxStart[1] - newBoxSize / 2}px`
        iconDiv.style.height = `${newBoxSize}px`
        iconDiv.style.width = `${newBoxSize}px`
    }
    if(animation == 0)
    {
        matrix = m4.multiply(matrix, m4.translation(boxStart[0], boxStart[1], 0));
        matrix = m4.multiply(matrix, m4.xRotation(initialRot));
        matrix = m4.multiply(matrix, m4.yRotation(initialRot));
        matrix = m4.multiply(matrix, m4.yRotation(-maxMouseRot * (mousex - 0.5)));
        matrix = m4.multiply(matrix, m4.translation(0, -easing(hTimer.time) * hoverHeight * resizeRatio, resizeRatio));
        matrix = m4.multiply(matrix, m4.scaling(mainBoxScale * resizeRatio, mainBoxScale * resizeRatio, mainBoxScale * resizeRatio))
    }
    else if(animation == 1)
    {
        matrix = m4.multiply(matrix, m4.translation(boxStart[0], boxStart[1], 0));
        matrix = m4.multiply(matrix, m4.scaling(resizeRatio, resizeRatio, resizeRatio));
        aTimer.tick(deltaTime);
        let anim = new CubeAnimation(boxStart, [initialRot, initialRot], mainBoxScale, animBoundary * resizeRatio, fullBoxDiff, [-initialRot, 0], [0, -initialRot], pTimer, deltaTime, bool1, () => {  if(window.location.hash != menuRoutes[animation - 1][3]) {window.location.href = <string>menuRoutes[animation - 1][3]};} );
        matrix = m4.multiply(matrix, anim.interpolate(easing(Math.min(aTimer.time + animOffset, 1))));
    }
    else if(animation == 2)
    {
        matrix = m4.multiply(matrix, m4.translation(boxStart[0], boxStart[1], 0));
        matrix = m4.multiply(matrix, m4.scaling(resizeRatio, resizeRatio, resizeRatio));
        
        aTimer.tick(deltaTime);
        let anim = new CubeAnimation(boxStart, [initialRot, initialRot], mainBoxScale, animBoundary * resizeRatio, fullBoxDiff, [0, initialRot], [-initialRot, 0], pTimer, deltaTime, bool2, () => { if(window.location.hash != menuRoutes[animation - 1][3]) {window.location.href = <string>menuRoutes[animation - 1][3]}} );
        matrix = m4.multiply(matrix, anim.interpolate(easing(Math.min(aTimer.time + animOffset, 1))));
    }
    else if(animation == 3)
    {
        matrix = m4.multiply(matrix, m4.translation(boxStart[0], boxStart[1], 0));
        matrix = m4.multiply(matrix, m4.scaling(resizeRatio, resizeRatio, resizeRatio));

        aTimer.tick(deltaTime);
        let anim = new CubeAnimation(boxStart, [initialRot, initialRot], mainBoxScale, animBoundary * resizeRatio, fullBoxDiff, [initialRot, 0], [0, initialRot], pTimer, deltaTime, bool3, () => { if(window.location.hash != menuRoutes[animation - 1][3]) {window.location.href = <string>menuRoutes[animation - 1][3]}} );
        matrix = m4.multiply(matrix, anim.interpolate(easing(Math.min(aTimer.time + animOffset, 1))));
    }
    else if(animation == 4)
    {
        aTimer.tick(deltaTime);
        matrix = m4.multiply(matrix, m4.translation(boxStart[0], boxStart[1], 0));
        matrix = m4.multiply(matrix, m4.xRotation(initialRot));
        matrix = m4.multiply(matrix, m4.yRotation(initialRot));
        matrix = m4.multiply(matrix, m4.yRotation(aTimer.time * SlowRotation));
        matrix = m4.multiply(matrix, m4.scaling(BlogResize * resizeRatio, BlogResize * resizeRatio, BlogResize * resizeRatio))
    }
    else if(animation == 5)
    {
        matrix = m4.multiply(matrix, m4.translation(boxStart[0], boxStart[1] - infoBoxOffset * resizeRatio, 0));
        matrix = m4.multiply(matrix, m4.xRotation(initialRot));
        matrix = m4.multiply(matrix, m4.yRotation(initialRot));
        matrix = m4.multiply(matrix, m4.scaling(mainBoxScale * resizeRatio, mainBoxScale * resizeRatio, mainBoxScale * resizeRatio))
    }
    gl.uniformMatrix4fv(matrixAttributeLocation, false, matrix);
    
    // Bind and set up the post processing buffer so we can write this to the backbuffer in postprocessing
    // This needs to happen frequently because the canvas size might change
    gl.bindBuffer(gl.ARRAY_BUFFER, pp_positionBuffer);
    setRectangleVert(gl, 0, 0, (<HTMLCanvasElement>gl.canvas).clientWidth, (<HTMLCanvasElement>gl.canvas).clientHeight);

    gl.bindTexture(gl.TEXTURE_2D, postBuffer);
    // Hard to find much info on these, apparently this scales the texture to whatever size
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, (<HTMLCanvasElement>gl.canvas).clientWidth, (<HTMLCanvasElement>gl.canvas).clientHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    gl.bindRenderbuffer(gl.RENDERBUFFER, postDepthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, (<HTMLCanvasElement>gl.canvas).clientWidth, (<HTMLCanvasElement>gl.canvas).clientHeight);
    
    // Attach the newly sized texture, then draw to it
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, postDepthBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, postBuffer, 0);
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Draw to the framebuffer
    gl.drawArrays(gl.TRIANGLES, 0, rectangle.getVertCount());

    postProcessing(pTimer.time, resizeRatio, boxStart);
    requestAnimationFrame(drawScene)
}

function SpawnIcon(name : string) : void
{
    let icon = document.createElement("i")
    icon.className = `fa-solid ${name}`
    icon.style.textAlign = "center"
    icon.style.color = lightGrey
    iconDiv.innerHTML = ""
    iconDiv.appendChild(icon)
}

//0 = full star, 1 = half star, 2 = empty star
function SpawnStar(index : number) : void
{
    let icon = document.createElement("i")
    icon.className = `${index == 2 ? "fa-regular" : "fa-solid"} ${index != 1 ? "fa-star" : "fa-star-half-stroke"}`
    ratingDiv.appendChild(icon);
}

function SpawnThumbnail(source : string) : void
{
    let image = document.createElement("img")
    image.id = "thumbimage";
    image.src = source;
    thumbDiv.appendChild(image);
}

function AddMenuHome()
{
    copyDiv.innerText = copyRight
    optionDiv.innerHTML = ""
    menuButtons = []

    for(let i=0; i < menuRoutes.length; i++)
    {
        let button = <HTMLButtonElement>document.createElement("button")
        button.id = "hoverButton"
        button.disabled = false;
        button.style.textAlign = "center"
        let icon = document.createElement("i")
        icon.className = `fa-solid ${menuRoutes[i][1]}`
        icon.style.textAlign = "center"
        button.addEventListener('click', () => { animOffset = 0; aTimer.time = 0; pTimer.time = 0; menuButtons.forEach((b) => {b.className = "disabled"; b.disabled = true}); animation = <number>menuRoutes[i][2];})
        optionDiv.appendChild(button)
        button.appendChild(icon)
        button.childNodes[0].textContent = ` - ${<string>menuRoutes[i][0]}`
        menuButtons = menuButtons.concat(button)
    }
}

function AddSubHome(pages : string[], base : string)
{
    pages = pages.sort()
    copyDiv.innerText = copyRight
    optionDiv.innerHTML = ""
    menuButtons = []

    for(let i=0; i < pages.length; i++)
    {
        let button = <HTMLButtonElement>document.createElement("button");
        button.id = "hoverButton";
        button.disabled = false;
        button.style.textAlign = "center";
        optionDiv.appendChild(button);
        button.textContent = `${pages[i].replace(/_/g, " ")}`;
        button.addEventListener('click', () => { window.location.href = `${base}/${pages[i]}`; });
        menuButtons = menuButtons.concat(button);
    }
}

document.onmousemove = (e) => 
{
    mousex = e.clientX / canvas.width;
}

//#region Mithriljs
function MenuView(Menucall : () => void) : any
{
    return {
        oncreate : function() {
            iconDiv = document.getElementById("iconContainer")
            optionDiv = document.getElementById("options")
            copyDiv = document.getElementById("copyRight")
            Menucall();
        },
        view: function() {
            return m("div", {class : "foreground"},
            [
                m("div", {id : "iconContainer"}),
                m("div", {id : "topBar"}),
                m("div", {id : "visualBar"}),
                m("div", {id : "centerBar"}, 
                [
                    m("div", {id : "options"})
                ]),
                m("div", {id : "footerBar"},
                [
                    m("i", {class : "fa-regular fa-copyright", name : "copyRight", id : "copyRight"})
                ]),
            ])
        }
    }
}

function BlogView(Menucall : () => any) : any
{
    return {
        oncreate : async function() {
            blogDiv = document.getElementById("article")
            thumbDiv = document.getElementById("thumbnail")
            ratingDiv = document.getElementById("rating")
            thumbDiv.addEventListener("click", (e) =>
            {
                thumbDiv.remove();
            })
            await Menucall();
        },
        view: function() {
            return m("div", {class : "foreground"},
            [
                m("div", {id : "article"}),
                m("div", {id : "thumbnail"}, 
                [
                    m("div", {id : "rating"})
                ])
            ])
        }
    }
}

function MiscView(Menucall : () => any) : any
{
    return {
        oncreate : async function() {
            blogDiv = document.getElementById("article")
            await Menucall();
        },
        view: function() {
            return m("div", {class : "foreground"},
            [
                m("div", {id : "article"})
            ])
        }
    }
}

function AboutView(Menucall : () => any) : any
{
    return {
        oncreate : async function() {
            abstractDiv = document.getElementById("abstract")
            infoDiv = document.getElementById("info")
            await Menucall();
        },
        view: function() {
            return m("div", {class : "foreground"},
            [
                m("div", {id : "grid"}, 
                [
                    m("div", {id : "abstract"}),
                    m("div", {id : "info"})
                ])
            ])
        }
    }
}

let Home = MenuView(AddMenuHome)
let Reviews = MenuView(() =>
    {
        m.request({
            method : "GET",
            url : "/content/reviews"
        }).then(function(items){ AddSubHome(<string[]>items, "#!/review"); SpawnIcon(<string>menuRoutes[animation - 1][1]); })
    }
)
let Creative = MenuView(() =>
    {
        m.request({
            method : "GET",
            url : "/content/creative"
        }).then(function(items){ AddSubHome(<string[]>items, "#!/misc"); SpawnIcon(<string>menuRoutes[animation - 1][1]); })
    }
)
let About = MenuView(() =>
    {
        m.request({
            method : "GET",
            url : "/content/about"
        }).then(function(items){ AddSubHome(<string[]>items, "#!/info"); SpawnIcon(<string>menuRoutes[animation - 1][1]); })
    }
)

let Review = BlogView(
    async () =>
    {
        let param = m.route.param("article");
        let call = async () =>
        {
            return m.request({
                method: "GET",
                url: `/content/reviews/${param}/${param}.md`,
                extract: function(xhr) { return xhr.responseText },
            })
            .then(function(response) {
                return [parse(response)]
            }).then(async (chain) => 
            {
                let response = await m.request({
                    method: "GET",
                    url: `/content/reviews/${param}/r_${param}.txt`,
                    extract: function(xhr) { return xhr. responseText }
                }).then(function(response) {
                    return response;
                })
                return chain.concat(response);
            })
        };

        let response = await call();
        let stars = Number(response[1]);
        blogDiv.innerHTML = response[0];
        SpawnThumbnail(`/content/reviews/${param}/t_${param}.jpg`);
        for(let i = 0; i < 10; i+= 2)
        {
            if(i == stars - 1)
                SpawnStar(1);
            else if(i < stars)
                SpawnStar(0);
            else
                SpawnStar(2);
        }
    }
)

let InfoPage = AboutView(
    async () =>
    {
        let param = m.route.param("article");
        let call = async () =>
        {
            return m.request({
                method: "GET",
                url: `/content/about/${param}/${param}.md`,
                extract: function(xhr) { return xhr.responseText },
            })
            .then(function(response) {
                return [parse(response)]
            }).then(async (chain) => 
            {
                let response = await m.request({
                    method: "GET",
                    url: `/content/about/${param}/i_${param}.md`,
                    extract: function(xhr) { return xhr. responseText }
                }).then(function(response) {
                    return parse(response);
                })
                return chain.concat(response);
            })
        };

        let response = await call();
        let abstract = response[0];
        let info = response[1];
        abstractDiv.innerHTML = abstract;
        infoDiv.innerHTML = info;
    }
)

let MiscPage = MiscView(
    async () =>
    {
        let param = m.route.param("article");
        let call = async () =>
        {
            return m.request({
                method: "GET",
                url: `/content/creative/${param}/${param}.md`,
                extract: function(xhr) { return xhr.responseText },
            })
            .then(function(response) {
                return parse(response)
            })
        }
        let response = await call();
        let article = response;
        blogDiv.innerHTML = article;
    }
)

let Warning = {
    view: function() {
		return m("h1", {class : "warning"}, "Unfortunately your webrowser does not support webGL2...")
	}
}

m.route(start, gl ? "/home" : "/warning", {
    "/home" : {
        onmatch : function(args, requestedPath, route)
        {
            bool1.reset()
            bool2.reset()
            bool3.reset()
            aTimer.time = 0;
            pTimer.time = 0;
            animation = 0;
            animOffset = 0;
            return Home;
        }
    },
    "/reviews" : {
        onmatch : function(args, requestedPath, route)
        {
            animation = 1;
            animOffset = 1;
            return Reviews;
        }
    },
    "/creative" : {
        onmatch : function(args, requestedPath, route)
        {
            animation = 2;
            animOffset = 1;
            return Creative;
        }
    },
    "/about" : {
        onmatch : function(args, requestedPath, route)
        {
            animation = 3;
            animOffset = 1;
            return About;
        }
    },
	"/review/:article": {
        onmatch : function(args, requestedPath, route)
        {
            pTimer.time = 0;
            animation = 4;
            animOffset = 0;
            return Review;
        }
    },
	"/misc/:article": {
        onmatch : function(args, requestedPath, route)
        {
            pTimer.time = 0;
            animation = 4;
            animOffset = 0;
            return MiscPage;
        }
    },
	"/info/:article": {
        onmatch : function(args, requestedPath, route)
        {
            bool1.reset()
            bool2.reset()
            bool3.reset()
            pTimer.time = 0;
            animation = 5;
            animOffset = 0;
            return InfoPage;
        }
    },
	"/warning": {
        onmatch : function(args, requestedPath, route)
        {
            animOffset = 1;
            return Warning;
        }
    },
})
//#endregion


requestAnimationFrame(drawScene);