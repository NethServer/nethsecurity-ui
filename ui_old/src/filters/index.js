export default {
  bitFormat: function(size) {
    var result;

    switch (true) {
      case size === null || size === "" || isNaN(size):
        result = "-";
        break;

      case size >= 0 && size < 1024:
        result = Math.round(size) + " bit";
        break;

      case size >= 1024 && size < Math.pow(1024, 2):
        result = Math.round(size / 1024 * 100) / 100 + " Kbit";
        break;

      case size >= Math.pow(1024, 2) && size < Math.pow(1024, 3):
        result = Math.round(size / Math.pow(1024, 2) * 100) / 100 + " Mbit";
        break;

      case size >= Math.pow(1024, 3) && size < Math.pow(1024, 4):
        result = Math.round(size / Math.pow(1024, 3) * 100) / 100 + " Gbit";
        break;

      default:
        result = Math.round(size / Math.pow(1024, 4) * 100) / 100 + " Tbit";
    }

    return result;
  },
  byteFormat: function(size) {
    var result;

    switch (true) {
      case size === null || size === "" || isNaN(size):
        result = "-";
        break;

      case size >= 0 && size < 1024:
        result = size.toFixed(2) + " B";
        break;

      case size >= 1024 && size < Math.pow(1024, 2):
        result = (Math.round((size / 1024) * 100) / 100).toFixed(2) + " KB";
        break;

      case size >= Math.pow(1024, 2) && size < Math.pow(1024, 3):
        result = (Math.round((size / Math.pow(1024, 2)) * 100) / 100).toFixed(2) + " MB";
        break;

      case size >= Math.pow(1024, 3) && size < Math.pow(1024, 4):
        result = (Math.round((size / Math.pow(1024, 3)) * 100) / 100).toFixed(2) + " GB";
        break;

      default:
        result = (Math.round((size / Math.pow(1024, 4)) * 100) / 100).toFixed(2) + " TB";
    }

    return result;
  },
  humanFormat: function(number, decimals = false) {
    var result;

    switch (true) {
      case number === null || number === "" || isNaN(number):
        result = "-";
        break;

      case number >= 0 && number < 1000:
        result = number;
        break;

      case number >= 1000 && number < Math.pow(1000, 2):
        if (decimals) {
          result = Math.round((number / 1000) * 10) / 10 + " K";
        } else {
          result = Math.round(number / 1000) + " K";
        }
        break;

      case number >= Math.pow(1000, 2) && number < Math.pow(1000, 3):
        if (decimals) {
          result = Math.round((number / Math.pow(1000, 2)) * 10) / 10 + " M";
        } else {
          result = Math.round(number / Math.pow(1000, 2)) + " M";
        }
        break;

      case number >= Math.pow(1000, 3) && number < Math.pow(1000, 4):
        if (decimals) {
          result = Math.round((number / Math.pow(1000, 3)) * 10) / 10 + " G";
        } else {
          result = Math.round(number / Math.pow(1000, 3)) + " G";
        }
        break;

      default:
        if (decimals) {
          result = Math.round((number / Math.pow(1000, 4)) * 10) / 10 + " T";
        } else {
          result = Math.round(number / Math.pow(1000, 4)) + " T";
        }
    }
    return result;
  },
  secondsFormat: function(value) {
    if (value < 0) {
      return "-";
    }

    let hours = parseInt(Math.floor(value / 3600));
    let minutes = parseInt(Math.floor((value - hours * 3600) / 60));
    let seconds = parseInt((value - (hours * 3600 + minutes * 60)) % 60);

    let duration = "";

    if (hours > 0) {
      duration += hours + "h ";
    }

    if (minutes > 0) {
      duration += minutes + "m ";
    }

    if (seconds > 0) {
      duration += seconds + "s";
    }

    if (!duration) {
      return "0s";
    }

    return duration.trim();
  },
  secondsLongFormat: function(value) {
    if (value < 0) {
      return "-";
    }

    let hours = parseInt(Math.floor(value / 3600));
    let minutes = parseInt(Math.floor((value - hours * 3600) / 60));
    let seconds = parseInt((value - (hours * 3600 + minutes * 60)) % 60);

    let dHours = hours > 9 ? hours : "0" + hours;
    let dMins = minutes > 9 ? minutes : "0" + minutes;
    let dSecs = seconds > 9 ? seconds : "0" + seconds;

    return dHours + "h " + dMins + "m " + dSecs + "s";
  },
  timestampToDate: function(value) {
    var a = new Date(value * 1000);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours() > 9 ? a.getHours() : "0" + a.getHours();
    var min = a.getMinutes() > 9 ? a.getMinutes() : "0" + a.getMinutes();
    var sec = a.getSeconds() > 9 ? a.getSeconds() : "0" + a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
  }
};
