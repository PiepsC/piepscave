import m from "mithril";
import {createProgram, createShader, resizeCanvasToDisplaySize, setGeometry, setColors, m4, setRectangleVert, setRectangleUV} from "./glUtilities";
import {Timer, Rectangle, CubeAnimation} from "./objects";
import BezierEasing from "bezier-easing";


let refHeight = 1080; //Reference screen height
let resizeRatio = 1;

// Constants
const hoverHeight = 50;
const boxOffset = 250;
const totalDepth = 800;
const initialRot = Math.PI / 4
const boxSize = 320;
//Ripple effect parameters
const baseRadius = 100;
const thickness = 38;
const speedUp = 5.5;
const dissipateSpeed = 7;
// Animation parameters
const animBoundary = 150;
const weirdOffset = 32;
//Colors
const lightGrey = "#969696" // Encoding of the background color in hex. This corresponds to (70,70,70)

// Hacks
let animOffset = 0; // On a route we want to instantly complete the animation interpolation
let animation = 0; // Animation index
let then = 0; // Used for deltatime
let menuButtons : HTMLButtonElement[] = [] // Save the current menu buttons for animation related things
let mainBoxScale = boxSize/Math.sqrt(2 * Math.pow(boxSize, 2))
let fullBoxDiff = 1.0 - mainBoxScale

let iconDiv, optionDiv, copyDiv;

// Menu routes. Others are dynamic, depending on the available files. Format (title, icon, animation, route)
const menuRoutes = [
    ["Reviews", "fa-pencil", 1, "#!/reviews"],
    ["Creative", "fa-dice", 2, "#!/creative"],
    ["About", "fa-graduation-cap", 3, "#!/about"]
]
// const copyRight = " 2023-2023 Lars Willemsen"
const copyRight = " 2023-2023"

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
// let postBuffer = gl.createTexture(gl.TEXTURE_3D);
let frameBuffer = gl.createFramebuffer();


// gl.bindTexture(gl.TEXTURE_2D, postBuffer);
// Hard to find much info on these, apparently this scales the texture to whatever size
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
// gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

// gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
// gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, postBuffer, 0);


// let rot = 0, then = 0, animation = 0;
let hTimer = new Timer(0, 0.6, 1);
let aTimer = new Timer(0, 0.6);
// let hTimer = new Timer(0, 0.3, 1);
let fTimer = new Timer(0, 20, 1);
let pTimer = new Timer(0, 1);

let easing = BezierEasing(0.65, 0, .35, 1);

function postProcessing(time, ratio, center)
{

    gl.bindBuffer(gl.ARRAY_BUFFER, pp_positionBuffer);
    // setRectangleVert(gl, 0, 0, (<HTMLCanvasElement>gl.canvas).clientWidth, (<HTMLCanvasElement>gl.canvas).clientHeight);
    setRectangleVert(gl, 0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(pp_program);
    // console.log(gl.canvas.width)
    // console.log((<HTMLCanvasElement>gl.canvas).clientWidth)

    gl.uniform1f(timeAttributeLocation, time * speedUp);
    gl.uniform1f(dissipateAttributeLocation, dissipateSpeed * ratio);
    gl.uniform1f(radiusAttributeLocation, baseRadius * ratio);
    gl.uniform1f(thicknessAttributeLocation, thickness * ratio);
    // gl.uniform2f(centerAttributeLocation, center[0], center[1] + gl.canvas.height / 2 );
    gl.uniform2f(centerAttributeLocation, center[0], center[1] + gl.canvas.height / 2 - weirdOffset * ratio);
    gl.uniform2f(resolutionAttributeLocation, (<HTMLCanvasElement>gl.canvas).clientWidth, (<HTMLCanvasElement>gl.canvas).clientHeight);
    
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

    // Draw from the framebuffer
    gl.bindTexture(gl.TEXTURE_2D, postBuffer);

    // Render to the backbuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    // gl.useProgram(pprogram);
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    // gl.drawArrays(gl.ACTIVE_TEXTURE, 0, rectangle.getVertCount());
}

// function drawScene(now)
// {
//     postProcessing(now);
//     requestAnimationFrame(drawScene);
// }

// let iconDiv = document.getElementsByName("iconContainer")[0]
function drawScene(now)
{
    // rot += 0.01
    // Calculate time to render frames
    now *= 0.001;
    var deltaTime = now - then;
    then = now;


    // Part for timers
    hTimer.tick(deltaTime);
    fTimer.tick(deltaTime);
    // pTimer.tick(deltaTime);
    if(fTimer.time < Number.EPSILON)
        rectangle.activateNext();

    resizeCanvasToDisplaySize(<HTMLCanvasElement>gl.canvas);
    resizeRatio = gl.canvas.height / refHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // rot += 0.01;

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
    matrix = m4.multiply(matrix, m4.translation(boxStart[0], boxStart[1], 0));
    matrix = m4.multiply(matrix, m4.scaling(resizeRatio, resizeRatio, resizeRatio));

    // iconDiv.style.top = `${0}px`
    let newBoxSize = boxSize * resizeRatio;
    iconDiv.style.left = `${boxStart[0] - newBoxSize / 2}px`
    iconDiv.style.top = `${boxStart[1] - newBoxSize / 2}px`
    // iconDiv.style.left = `${100}px`
    iconDiv.style.height = `${newBoxSize}px`
    iconDiv.style.width = `${newBoxSize}px`
    if(animation == 0)
    {
        // matrix = m4.multiply(matrix, m4.zRotation(Math.PI / 4));
        // matrix = m4.multiply(matrix, m4.yRotation(rot));
        matrix = m4.multiply(matrix, m4.xRotation(initialRot));
        matrix = m4.multiply(matrix, m4.yRotation(initialRot));
        // matrix = m4.multiply(matrix, m4.yRotation(Math.PI / 4 + rot));
        // matrix = m4.multiply(matrix, m4.scaling(resizeRatio, resizeRatio, resizeRatio));
        matrix = m4.multiply(matrix, m4.translation(0, -easing(hTimer.time) * hoverHeight * resizeRatio, resizeRatio));
        matrix = m4.multiply(matrix, m4.scaling(mainBoxScale, mainBoxScale, mainBoxScale))
    }
    else if(animation == 1)
    {
        aTimer.tick(deltaTime);
        let anim = new CubeAnimation(boxStart, [initialRot, initialRot], mainBoxScale, animBoundary * resizeRatio, fullBoxDiff, [-initialRot, 0], [0, -initialRot], pTimer, deltaTime, () => { SpawnIcon(newBoxSize, <string>menuRoutes[animation - 1][1]); if(window.location.hash != menuRoutes[animation - 1][3]) {window.location.href = <string>menuRoutes[animation - 1][3]}} );
        matrix = m4.multiply(matrix, anim.interpolate(easing(Math.min(aTimer.time + animOffset, 1))));
    }
    else if(animation == 2)
    {
        aTimer.tick(deltaTime);
        let anim = new CubeAnimation(boxStart, [initialRot, initialRot], mainBoxScale, animBoundary * resizeRatio, fullBoxDiff, [0, initialRot], [-initialRot, 0], pTimer, deltaTime, () => { SpawnIcon(newBoxSize, <string>menuRoutes[animation - 1][1]); if(window.location.hash != menuRoutes[animation - 1][3]) {window.location.href = <string>menuRoutes[animation - 1][3]}} );
        matrix = m4.multiply(matrix, anim.interpolate(easing(Math.min(aTimer.time + animOffset, 1))));
    }
    else if(animation == 3)
    {
        aTimer.tick(deltaTime);
        let anim = new CubeAnimation(boxStart, [initialRot, initialRot], mainBoxScale, animBoundary * resizeRatio, fullBoxDiff, [initialRot, 0], [0, initialRot], pTimer, deltaTime, () => { SpawnIcon(newBoxSize, <string>menuRoutes[animation - 1][1]); if(window.location.hash != menuRoutes[animation - 1][3]) {window.location.href = <string>menuRoutes[animation - 1][3]}} );
        matrix = m4.multiply(matrix, anim.interpolate(easing(Math.min(aTimer.time + animOffset, 1))));
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
    // gl.drawBuffers

    // Draw to the framebuffer
    gl.drawArrays(gl.TRIANGLES, 0, rectangle.getVertCount());

    postProcessing(pTimer.time, resizeRatio, boxStart);
    requestAnimationFrame(drawScene)
}

function SpawnIcon(size : number, name : string) : void
{
    let icon = document.createElement("i")
    icon.className = `fa-solid ${name} fa-${Math.floor(size / 50)}x`
    icon.style.textAlign = "center"
    icon.style.color = lightGrey
    iconDiv.innerHTML = ""
    iconDiv.appendChild(icon)
}

function DestroyIcon()
{
    // let iconContainer = document.getElementsByName("iconContainer")[0];
    iconDiv.innerHTML = ""
}

function AnimateToBio()
{
    aTimer.time = 0;
    pTimer.time = 0;
    animation = 3;
}

function AnimateToCreative()
{
    aTimer.time = 0;
    pTimer.time = 0;
    animation = 2;
}

function AnimateToReviews()
{
    aTimer.time = 0;
    pTimer.time = 0;
    animation = 1;
}

function AnimateToHome()
{
    aTimer.time = 0;
    pTimer.time = 0;
    animation = 0;
}

function AddMenuHome()
{
    // let optionContainer = document.getElementsByName("options")[0];
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
        // icon.style.color = lightGrey
        button.addEventListener('click', () => { animOffset = 0; aTimer.time = 0; pTimer.time = 0; menuButtons.forEach((b) => {b.className = "disabled"; b.disabled = true}); animation = <number>menuRoutes[i][2];})
        optionDiv.appendChild(button)
        button.appendChild(icon)
        button.childNodes[0].textContent = ` - ${<string>menuRoutes[i][0]}`
        menuButtons = menuButtons.concat(button)
    }
}

function AddSubHome(pages : string[])
{
    pages = pages.sort()
    copyDiv.innerText = copyRight
    optionDiv.innerHTML = ""
    menuButtons = []

    for(let i=0; i < pages.length; i++)
    {
        let button = <HTMLButtonElement>document.createElement("button")
        button.id = "hoverButton"
        button.disabled = false;
        button.style.textAlign = "center"
        // icon.style.color = lightGrey
        // button.addEventListener('click', () => { animOffset = 0; aTimer.time = 0; pTimer.time = 0; menuButtons.forEach((b) => {b.className = "disabled"; b.disabled = true}); animation = <number>menuRoutes[i][2];})
        optionDiv.appendChild(button)
        button.textContent = `${pages[i]}`
        menuButtons = menuButtons.concat(button)
    }
}

//#region Mithriljs

function MenuView() : any
{
    return {
        oncreate : function() {
            iconDiv = document.getElementsByName("iconContainer")[0]
            optionDiv = document.getElementsByName("options")[0]
            copyDiv = document.getElementsByName("copyRight")[0]
            AddMenuHome();
        },
        view: function() {
            return m("div", {class : "foreground"},
            [
                m("div", {name : "iconContainer"}),
                m("div", {id : "topBar"}),
                m("div", {id : "visualBar"}),
                m("div", {id : "centerBar"}, 
                [
                    m("div", {name : "options", id : "options"})
                ]),
                m("div", {id : "footerBar"},
                [
                    m("i", {class : "fa-regular fa-copyright", name : "copyRight", id : "copyRight"})
                ]),
            ])
        }
    }
}

let Menu = MenuView()

let Warning = {
    view: function() {
		return m("h1", {class : "warning"}, "Unfortunately your webrowser does not support webGL2...")
	}
}

m.route(start, gl ? "/loading" : "/warning", {
    "/loading" : Menu,
    "/home" : {
        onmatch : function(args, requestedPath, route)
        {
            if(document.getElementsByName("iconContainer").length > 0)
            {
                DestroyIcon()
                AddMenuHome()
            }
            aTimer.time = 0;
            pTimer.time = 0;
            animation = 0;
            animOffset = 0;
            return Menu;
        }
    },
    "/reviews" : {
        onmatch : function(args, requestedPath, route)
        {
            animation = 1;
            animOffset = 1;
            m.request({
                method : "GET",
                url : "/content/reviews"
            }).then(function(items){ AddSubHome(<string[]>items); })
            // AddMenuHome();
            return Menu;
        }
    },
    "/creative" : {
        onmatch : function(args, requestedPath, route)
        {
            animation = 2;
            animOffset = 1;
            return Menu;
        }
    },
    "/about" : {
        onmatch : function(args, requestedPath, route)
        {
            animation = 3;
            animOffset = 1;
            return Menu;
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

m.request({
    method : "GET",
    url : "/content/reviews"
}).then(function(items){ console.log(items); })

// Used so the route is actually completed before querying itemcontainer from the dom
await new Promise(async () => {
    await setTimeout(() =>{
    iconDiv = document.getElementsByName("iconContainer")[0]
    iconDiv.style.position = "absolute"
    iconDiv.style.display = "flex"
    iconDiv.style.justifyContent = "center"
    iconDiv.style.alignItems = "center"
    window.location.href = "#!/home"
    requestAnimationFrame(drawScene)
    }, 100);
})

// .then(
//     await new Promise(async () => {
//         await setTimeout(() =>{
//         window.location.href = "#!/warning"
//         requestAnimationFrame(drawScene)
//         }, 1000);
//     })

// )
