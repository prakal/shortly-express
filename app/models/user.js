var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function(){
    // this.on('creating', this.hashPassword);
  },

  hashPassword: function(password,callback){
    var that = this;

    bcrypt.hash(password,null,null,function(err,result){
      that.set('password',result);
      console.log('what is the callback',callback);
      callback();
    });
  },

  comparePassword: function(rawPassword,callback){
    bcrypt.compare(rawPassword,this.get('password'),function(err,isValidPassword){
      callback(isValidPassword);
    });
  }

});

module.exports = User;

var hashed
