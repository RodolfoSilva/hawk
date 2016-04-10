const configs = {};

module.exports = {
  get: function (key) {
    if (configs.hasOwnProperty(key)) {
      return configs[key].value;
    }
  },


  default: function (key, value) {
    if (configs.hasOwnProperty(key)) {
      return configs[key].value;
    } else {
      return value;
    }
  },


  set: function (key, value, constant) {
    if (configs.hasOwnProperty(key)) {
      if (configs[key].constant) {
        throw new Error("You can't change a constant value");
      }
      configs[key].value = value;
    } else {
      configs[key] = {
        value: value,
        constant: Boolean(constant)
      };
    }
    return this;
  }
};
