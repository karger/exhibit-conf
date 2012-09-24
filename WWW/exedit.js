ExhibitConf.Editor = {};

(function () {
    var EC = ExhibitConf,
    EE = EC.Editor,

    configMenuBar = function(bar, conf) {//list of class/function pairs
	bar.on('click', 'a[class]', function () {
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
	config.done(function () {ExhibitConf.rerender()});
	config.fail(function() {
	    component.remove();
	});
    };
    
    test = function() {
	$('#editor-iframe-container')
	    .append('<iframe seamless src="http://people.csail.mit.edu/karger"></iframe>');
    };

    test2 = function() {
	var h = $('#editor-iframe-container').children().contents().height();
	$('#editor-iframe-container').contents().height(h);
	$('#editor-iframe-container').contents().width('100%');
    }

    EE.open = function() {
	EC.open().done(function(text) {alert(text);});
    };

    EE.saveAs = function() {
	var dom = $(document.documentElement).clone();
	EC.unrender(dom);
	dom.find('script:not(.keep)').remove();
	dom.find('link:not(.keep)').remove();
	EC.saveHtml(dom.html());
    };

    EE.addFacet = function() {
	EE.addComponent($('<div ex:role="facet" class="exhibit-editable"></div>'),
			$('#facet-container'));
    };

    EE.addView = function() {
	EE.addComponent($('<div ex:role="view" class="exhibit-editable"></div>'),
			$('.main-panel'));
    };
    
    //let an invoked state specify what should happen when we 
    //transition to a different state.
    EE.cleanupCallback = function() {
    };
    EE.cleanup = function(callback) {
	if (EE.cleanupCallback) {
	    EE.cleanupCallback();
	}
	EE.cleanupCallback = callback;
    };

    EE.preview = function() {
	EE.cleanup();
	$('#main').show();
	ExhibitConf.rerender();
    };

    EE.editPage = function() {
	EE.cleanup(function () {
	    $('.page-insert-menu').hide();
	    ExhibitConf.stopEdit();
	    ExhibitConf.rerender();
	});
	$('#main').show();
	$('.page-insert-menu').show();
	ExhibitConf.rerender();
	ExhibitConf.startEdit();
    };
    
    EE.lensEditor = {};
    EE.editLens = function() {
	var lens = $('[ex\\:role="lens"]');

	EE.lensEditor = ExhibitConf.createLensEditor(lens, $('.lens-edit-container'));

	EE.cleanup(function () {
	    $('#lens-editor').hide();
	    $('.lens-insert-menu').hide();
	    EE.lensEditor.stopEdit();
	    ExhibitConf.rerender();
	});
	if (lens.length === 0) {
	    lens = $('<div ex\:role="lens"></div>');
	}
	$('#main').hide();
	$('.lens-insert-menu').show();
	$('#lens-editor').show();
    };

    EE.addLensText = function() {
	EE.lensEditor.addText('.lens-edit-container');
    }

    EE.addLensImg = function() {
	EE.lensEditor.addImg('.lens-edit-container');
    }

    $(document).ready(function() {
	var maybeSetData = function() {
	    var i, url, arg,
	    link = $('[rel="exhibit/data"]'),
	    args = window.location.search.substr(1).split('&');

	    for (i=0; i<args.length; i++) {
		arg = args[i];
		if (arg.substr(0,4) === "data") {
		    link.attr('href',arg.substr(5));
		} else if (arg.substr(0,4) === "type") {
		    link.attr('type',arg.substr(5));
		} 
	    }
	}
	    
	maybeSetData();
	$('.lens-insert-menu').hide();
	$('.page-insert-menu').hide();
	configMenuBar($('.topnav'), {"new-button":  todo,
				     "open-button": EE.open,
				     "save-button": EE.saveAs,
				     "preview-button": EE.preview,
				     "edit-exhibit-button": EE.editPage,
				     "edit-lens-button": EE.editLens,
				     "edit-data-button": ExhibitConf.configureData,
				     "help-button": todo,
				     "wizard-button": todo,
				     "add-view-button": EE.addView,
				     "add-facet-button": EE.addFacet,
				     "add-content-button": EE.addLensText,
				     "add-link-button": todo,
				     "add-img-button": EE.addLensImg
				    });

    });
})();