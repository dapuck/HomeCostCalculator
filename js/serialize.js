(function($) {
	$.fn.extend({
		serialize: function(returnObject) {
			if(returnObject) {
				var frmArray = this.serializeArray();
				var frmObj = {};
				for(var i = 0; i < frmArray.length; i++) {
					frmObj[frmArray[i].name] = frmArray[i].value;
				}
				return frmObj;
			} else {
				return $.param(this.serializeArray());
			}
		}
	});
})((typeof Zepto != 'undefined')? Zepto : jQuery);