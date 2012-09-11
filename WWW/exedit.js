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

    

    EE.addComponent = function(component, parent) {
	config = ExhibitConf.configureElement(component);
	parent.append(component);
	config.done(ExhibitConf.rerender);
	config.fail(function() {
	    component.remove();
	});
    };
    

    EE.addFacet = function() {
	EE.addComponent($('<div ex:role="facet"></div>'),
			$('#facet-container'));
    };

    EE.addView = function() {
	EE.addComponent($('<div ex:role="view"></div>'),
			$('#view-panel'));
    };


    $(document).ready(function() {
	configMenuBar('.topnav', {"new-button":  todo,
				  "open-button": todo,
				  "save-button": todo,
				  "edit-exhibit-button": ExhibitConf.startEdit,
				  "edit-lens-button": todo,
				  "edit-data-button": ExhibitConf.configureData,
				  "help-button": todo,
				  "wizard-button": todo,
				  "add-viewpanel-button": todo,
				  "add-view-button": EE.addView,
				  "add-facet-button": EE.addFacet
				 });
    });
})();