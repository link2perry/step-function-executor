module.exports = {
    getValue: (obj, hierarchy) => {
    if(typeof hierarchy === 'string') {
      hierarchy = hierarchy.split('.');
    }
    let prop = hierarchy.shift();
    if(hierarchy.length > 0) {
      if(!obj[prop]) {
        return null;
      }
      return module.exports.getValue(obj[prop], hierarchy);
    } else {
      return obj[prop];
    }
  },

    /**
   * Deep copy an object
   * @param target
   * @param ...sources
   */
	clone: (target) => {
    let clone;
    if (target) {
      clone = JSON.parse(JSON.stringify(target));
    }
    return clone;
  }
}