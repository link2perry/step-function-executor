function ItemNotFoundException(functionName) {
  this.name = "ItemNotFoundException";
  this.message = `The function "${functionName}" was not found.` ;
}
ItemNotFoundException.prototype = new Error();

module.exports = ItemNotFoundException;
