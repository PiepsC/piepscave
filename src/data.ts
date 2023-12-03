let model = function(name : string)
{
	// Enter the website name
	this.name = name;
};

let view = function(root : string)
{
	// Enter the root element
	this.root = document.querySelector(root);
}