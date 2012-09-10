ExhibitConf = {};
ExhibitConf.Editor = {};

(function () {
    var EC = ExhibitConf,
    EE = EC.Editor,

    configMenuBar = function(sel, conf) {//list of class/function pairs
	$(sel).on('click', 'a[class]', function () {
	    var cl = $(this).attr('class');
	    if (cl && conf[cl]) {
		conf[cl]();
	    }
	    return true; //allow propagation
	});
    },

    todo = function() {alert('todo');};
    
    $(document).ready(function() {
	configMenuBar('.topnav', {"new-button":  todo,
				  "open-button": todo,
				  "save-button": todo,
				  "edit-exhibit-button": todo,
				  "edit-lens-button": todo,
				  "edit-data-button": todo,
				  "help-button": todo,
				  "wizard-button": todo
				 });
    });
})();