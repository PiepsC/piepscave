import { Comp } from "mithril";
import {m4} from "./glUtilities";

type matrix = number[];
type vector = number[];

export class Lattice
{
	// A lattice is just a 2d sequence of rectangular quads
	readonly segments : number;
	readonly width : number;
	readonly height : number;
	readonly offset : matrix;
	readonly delta : number;
	readonly rawdelta : number;
	readonly color : vector;
	readonly color2 : vector;
	readonly colorConst : number[] = [];

	// Mutable data
	_verts : number[] = [];
	_vertCount : number = 0;
	_activeQuad = -1;

	constructor(segments : number, width : number, color : vector, color2 : vector, offset : matrix, delta=0)
	{
		// Construction must be placed in a loading screen or something. This is CPU bound and might be REAL SLOW
		this.segments = segments;
		this.width = width;
		this.offset = offset;
		this.rawdelta = delta;
		this.delta = delta * 6 * 4;
		this.height = width / segments;
		this.color = color;
		this.color2 = color2;
		this.calculateGeometry();
		this.colorConst = Array(segments * 6).fill(color).flat();
	}

	public get colors()
	{
		return this._activeQuad < 0 ? this.colorConst : this.colorConst.slice(0, this.delta + this._activeQuad * 6 * 4).concat(Array(6).fill(this.color2).flat().concat(this.colorConst.slice(this._activeQuad * 6 * 4 + 6 * 4 + this.delta)));
	}

	activateNext()
	{
		this._activeQuad += 1;
	}

	calculateGeometry() : void
	{
		for(let i=0; i < this.segments; i++)
		{
			let v1 : vector = [this.height * i, 0, 0, 1];
			let v2 : vector = [this.height * (i + 1), 0, 0, 1];
			let v3 : vector = [this.height * i, this.height, 0, 1];
			let v4 : vector = [this.height * (i + 1), this.height, 0, 1];
			this._verts.push(...m4.vecMultipy(v1, this.offset).slice(0, -1));
			this._verts.push(...m4.vecMultipy(v2, this.offset).slice(0, -1));
			this._verts.push(...m4.vecMultipy(v3, this.offset).slice(0, -1));
			this._verts.push(...m4.vecMultipy(v2, this.offset).slice(0, -1));
			this._verts.push(...m4.vecMultipy(v4, this.offset).slice(0, -1));
			this._verts.push(...m4.vecMultipy(v3, this.offset).slice(0, -1));
			this._vertCount += 6;
		}
	}
}

class Quad
{
	// A quad is just a rectangular quad
	readonly size : number;
	readonly offset : matrix;
	readonly color : vector;

	// Mutable data
	_verts : number[] = [];
	_colors : number[] = [];
	_vertCount : number = 6;

	constructor(size : number, color : vector, offset : matrix)
	{
		this.size = size;
		this.offset = offset;
		this.color = color;

		let v1 : vector = [0, 0, 0, 1];
		let v2 : vector = [size, 0, 0, 1];
		let v3 : vector = [0, size, 0, 1];
		let v4 : vector = [size, size, 0, 1];
		this._verts.push(...m4.vecMultipy(v1, this.offset).slice(0, -1));
		this._verts.push(...m4.vecMultipy(v2, this.offset).slice(0, -1));
		this._verts.push(...m4.vecMultipy(v3, this.offset).slice(0, -1));
		this._verts.push(...m4.vecMultipy(v2, this.offset).slice(0, -1));
		this._verts.push(...m4.vecMultipy(v4, this.offset).slice(0, -1));
		this._verts.push(...m4.vecMultipy(v3, this.offset).slice(0, -1));
		this._colors.push(...this.color);
		this._colors.push(...this.color);
		this._colors.push(...this.color);
		this._colors.push(...this.color);
		this._colors.push(...this.color);
		this._colors.push(...this.color);
	}
}

class Composite
{
	readonly one : Lattice;
	readonly two : Lattice;

	_verts : number[] = []
	_vertCount : number = 0;

	constructor(one : Lattice, two : Lattice)
	{
		this.one = one;
		this.two = two;
		if(this.one.segments - this.one.rawdelta * 2 != this.two.segments - this.two.rawdelta * 2) throw console.error("Lattices must be of equal segment length!");
		this.calculateGeometry()
	}

	calculateGeometry() : void
	{
		this._verts = this._verts.concat(this.one._verts);
		this._verts = this._verts.concat(this.two._verts);
		// this._colors = this._colors.concat(this.one.colors);
		// this._colors = this._colors.concat(this.two.colors);
		this._vertCount = this.one._vertCount + this.two._vertCount;
	}

	get activeQuad() : number
	{
		return this.one._activeQuad;
	}

	set activeQuad(next : number)
	{
		this.one._activeQuad = next;
		this.two._activeQuad = next;
	}

	get colors() : number[]
	{
		return this.one.colors.concat(this.two.colors)
	}

	activateNext()
	{
		if(this.activeQuad < this.one.segments - 1 - this.one.rawdelta) // Assumes equal length on both lattices
		{
			this.one.activateNext()
			this.two.activateNext()
			this.activeQuad += 1;
		} else 
			this.activeQuad = -2; // -2 signals the end, called should set it back to -1
	}
}

// Allow passing by reference
export class ToggleBoolean
{
	value : boolean;
	readonly start : boolean;

	constructor(value : boolean) { this.value = value; this.start = value; }

	reset() {this.value = this.start;}
}

// A class to encode the simple cube animation that plays before routing
export class CubeAnimation
{
	readonly startRotation : vector;
	readonly startPosition : vector;
	readonly startScale : number;
	readonly scaTarget : number;
	readonly rotTarget1 : vector;
	readonly rotTarget2 : vector;
	readonly boundary : number;
	readonly delta : number;

	timer : Timer
	callback : () => void;
	called : ToggleBoolean;

	constructor(location : vector, rotation : vector, scale : number, boundary : number, scaleTarget : number, rotateTarget1 : vector, rotateTarget2 : vector, timer : Timer, delta : number, called? : ToggleBoolean, callback? : () => void)
	{
		this.startPosition = location;
		this.startRotation = rotation;
		this.startScale = scale;
		this.boundary = boundary;
		this.rotTarget1 = rotateTarget1;
		this.rotTarget2 = rotateTarget2;
		this.scaTarget = scaleTarget;
		this.delta = delta;
		this.timer = timer;
		this.called = called;
		if(callback)
			this.callback = callback;
	}

	interpolate(value : number) : matrix
	{
		let rotation = [0, 0]
		let translation = [0, 0]
		let scale = 0
		if(value < 0.25) // Phase one
		{
			translation = [-this.boundary * (value / 0.25), 0];
		} 
		else if(value < 0.5)
		{
			let im = (value - 0.25) / 0.25;
			translation = [-this.boundary * (1 - im), 0]
			rotation = [this.rotTarget1[0] * im, this.rotTarget1[1] * im]
		}
		else if(value < 0.75)
		{
			translation = [this.boundary * ((value - 0.5) / 0.25), 0];
			rotation = this.rotTarget1;
		} 
		else if(value < 1)
		{
			let im = (value - 0.75) / 0.25;
			translation = [this.boundary * (1 - im), 0]
			rotation = [this.rotTarget1[0] + this.rotTarget2[0] * im, this.rotTarget1[1] + this.rotTarget2[1] * im]
			scale = this.scaTarget * ((value - 0.75) / 0.25);
		}
		else
		{
			if(!this.called.value)
			{
				this.called.value = true;
				this.callback();
			}
			translation = [0, 0]
			rotation =  [this.rotTarget1[0] + this.rotTarget2[0], this.rotTarget1[1] + this.rotTarget2[1]]
			scale = this.scaTarget;
			this.timer.tick(this.delta);
		}

		return m4.multiply(m4.multiply(m4.translation(translation[0], translation[1], 0), m4.multiply(m4.xRotation(rotation[0] + this.startRotation[0]), m4.yRotation(rotation[1] + this.startRotation[1]))), m4.scaling(this.startScale + scale, this.startScale + scale, this.startScale + scale));
	}

}

export class Timer
{
	// A helper class for various timer related events in the update loop
	readonly step : number;
	readonly max : number;
	time : number;
	increasing : boolean;
	flip = false;
	tick : (delta : number) => void;
	constructor(offset : number, step = 1, max? : number)
	{
		this.time = 0 + offset;
		this.step = step;
		this.increasing = true;
		if(max)
		{
			this.tick = (delta) => {if(document.hasFocus()) this.alternating(delta)};
			this.max = max;
		} else
			this.tick = (delta) => {if(document.hasFocus()) this.non_alternating(delta)};
	}

	non_alternating(delta : number) {this.time = this.time >= Number.MAX_VALUE - Number.EPSILON ? 0 : this.time + this.step * delta;}
	alternating(delta : number) {
		this.flip = this.increasing;
		this.increasing = this.time < Number.EPSILON || (this.increasing && this.time < this.max - Number.EPSILON);
		this.flip = this.flip != this.increasing;
		this.time = this.time + (this.increasing ? this.step * delta : -this.step * delta);
	}
}

class LatticeList
{
	readonly index : number; 
	_next : LatticeList[];

	constructor(index : number)
	{
		this.index = index;
	}

	get next() : LatticeList
	{
		return this._next[Math.floor(Math.random() * this._next.length)]
	}

	set next(val : LatticeList[])
	{
		this._next = val;
	}
}

export class Rectangle
{
	// The stylish rectangle is composed of 12 lattices and 3 quads blocking back faces
	readonly objects : Composite[] = [];
	readonly faces : Quad[] = [];
	readonly size : number;
	readonly latticeWidth : number;
	readonly activeColor : vector;
	_currentLat : LatticeList;
	testindex = 0;

	constructor(segmentsPerLattice : number, size : number, color : vector, color2 : vector, color3 : vector)
	{
		this.activeColor = color3;
		// Don't ask me why
		let antiJitter = 0.05;
		// Delta is the size of a single rect
		let delta = size / segmentsPerLattice;
		this.size = size;

		let l1 = new LatticeList(0);
		let l2 = new LatticeList(1);
		let l3 = new LatticeList(2);
		let l4 = new LatticeList(3);
		let l5 = new LatticeList(4);
		let l6 = new LatticeList(5);
		let l7 = new LatticeList(6);
		let l8 = new LatticeList(7);
		let l9 = new LatticeList(8);
		let l10 = new LatticeList(9);
		let l11 = new LatticeList(10);
		let l12 = new LatticeList(11);
		l1.next = [l12, l3] // Middle front vertical
		l2.next = [l4] // Left front vertical
		l3.next = [l2, l11] // Left front top
		l4.next = [l1] // Left bottom front
		l5.next = [l10] // Right front vertical
		l6.next = [l8, l9] // Middle back vertical
		l7.next = [l6] // Right top back
		l8.next = [l10] // Right bottom back
		l9.next = [l4] // Left bottom back
		l10.next = [l1] // Right bottom front
		l11.next = [l6] // Left top back
		l12.next = [l5, l7] // Right front top
		this._currentLat = l1;


		this.faces.push(new Quad(size - 2 * delta, color2, m4.multiply(m4.translation(- size / 2 + delta, -size / 2 - antiJitter, - size / 2 + delta), m4.xRotation(Math.PI / 2))));
		this.faces.push(new Quad(size - 2 * delta, color2, m4.multiply(m4.translation(- size / 2 + delta, -size / 2 + delta, - size / 2), m4.xRotation(0))));
		this.faces.push(new Quad(size - 2 * delta, color2, m4.multiply(m4.translation(size / 2, -size / 2 + delta, size / 2 - delta), m4.yRotation(Math.PI / 2))));

		// Front face
		let cLFL = new Composite(new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.translation(- size / 2 + delta, -size / 2, -size / 2), m4.zRotation(Math.PI / 2))),
			new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(- size / 2, -size / 2, -size / 2), m4.zRotation(Math.PI / 2)), m4.xRotation(Math.PI / 2))));
		let cRFL = new Composite(new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.translation(+ size / 2 - delta, size / 2, -size / 2), m4.zRotation(-Math.PI / 2))), new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(+ size / 2, size / 2, -size / 2 + delta), m4.zRotation(-Math.PI / 2)), m4.xRotation(-Math.PI / 2))));
		// NOTE: UNEVEN COMPOSITION!!!
		let cTFL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(size / 2 - delta, -size / 2 + delta, -size / 2), m4.zRotation(Math.PI))),
			new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(size / 2, -size / 2, -size / 2 + delta), m4.zRotation(Math.PI)), m4.xRotation(-Math.PI / 2)), 1));
		let cBFL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(- size / 2 + delta, size / 2 - delta, -size / 2), m4.zRotation(0))), new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.translation(- size / 2, size / 2, -size / 2), m4.xRotation(Math.PI / 2)), 1));

		this.objects.push(cRFL);
		this.objects.push(cLFL);
		this.objects.push(cTFL);
		this.objects.push(cBFL);

		// Back face
		let cLBL = new Composite(new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.translation(- size / 2 + delta, -size / 2, size / 2), m4.zRotation(Math.PI / 2))),
			new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(- size / 2, -size / 2, size / 2 - delta), m4.zRotation(Math.PI / 2)), m4.xRotation(Math.PI / 2))));
		let cRBL = new Composite(new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.translation(+ size / 2, -size / 2, size / 2), m4.zRotation(Math.PI / 2))),
			new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(+ size / 2, -size / 2, size / 2 - delta), m4.zRotation(Math.PI / 2)), m4.xRotation(Math.PI / 2))));
		// NOTE: UNEVEN COMPOSITION!!!
		let cTBL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(size / 2 - delta, -size / 2 + delta, size / 2), m4.zRotation(Math.PI))),
			new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(size / 2, -size / 2, size / 2), m4.zRotation(Math.PI)), m4.xRotation(-Math.PI / 2)), 1));
		let cBBL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(- size / 2 + delta, size / 2 - delta, size / 2), m4.zRotation(0))), new Lattice(segmentsPerLattice, size, color, this.activeColor, m4.multiply(m4.translation(- size / 2, size / 2, size / 2), m4.xRotation(-Math.PI / 2)), 1));

		this.objects.push(cRBL);
		this.objects.push(cLBL);
		this.objects.push(cTBL);
		this.objects.push(cBBL);

		// Side lattices
		let cRSBL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(- size / 2, size / 2 - delta, size / 2 - delta), m4.yRotation(Math.PI / 2))),
			new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(- size / 2 + delta, size / 2, size / 2 - delta), m4.yRotation(Math.PI / 2)), m4.xRotation(-Math.PI / 2))));
		let cLSBL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(size / 2, size / 2 - delta, size / 2 - delta), m4.yRotation(Math.PI / 2))),
			new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(size / 2 - delta, size / 2, size / 2 - delta), m4.yRotation(Math.PI / 2)), m4.xRotation(Math.PI / 2))));
		let cRSTL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(- size / 2, -size / 2, -size / 2 + delta), m4.yRotation(-Math.PI / 2))), new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(- size / 2, -size / 2, -size / 2 + delta), m4.yRotation(-Math.PI / 2)), m4.xRotation(-Math.PI / 2))));
		let cLSTL = new Composite(new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.translation(size / 2, -size / 2, -size / 2 + delta), m4.yRotation(-Math.PI / 2))), new Lattice(segmentsPerLattice - 2, size - 2 * delta, color, this.activeColor, m4.multiply(m4.multiply(m4.translation(size / 2, -size / 2, -size / 2 + delta), m4.yRotation(-Math.PI / 2)), m4.xRotation(Math.PI / 2))));

		this.objects.push(cRSBL);
		this.objects.push(cLSBL);
		this.objects.push(cRSTL);
		this.objects.push(cLSTL);
	}

	activateNext() : void
	{
		let index = this._currentLat.index;
		let target = this.objects[index];
		if(target.activeQuad < -1)
		{
			target.activeQuad = -1;
			this._currentLat = this._currentLat.next;
		}
		else
		{
			target.activateNext();
		}
	}

	getVerts() : number[]
	{
		var acc = [];
		
		this.objects.forEach((lat) =>
		{
			acc = acc.concat(lat._verts);
		})
		this.faces.forEach((face) =>
		{
			acc = acc.concat(face._verts);
		})
		return acc;
	}

	getColors() : number[]
	{
		let acc = [];
		
		this.objects.forEach((lat) =>
		{
			acc = acc.concat(lat.colors);
		})
		
		this.faces.forEach((face) =>
		{
			acc = acc.concat(face._colors);
		})
		return acc;
	}

	getVertCount() : number
	{
		let acc = 0;
		this.faces.forEach((face) =>
		{
			acc += face._vertCount;
		})

		this.objects.forEach((lat) =>
		{
			acc += lat._vertCount;
		})
		return acc;
	}
}