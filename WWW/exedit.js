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
	    if (parent) {
		//insert in specified node
		parent.append(component);
	    } else {
		//insert at current selection
		range = EC.win.getSelection().getRangeAt(0),
		range.insertNode(component.get(0));
	    }
	    config.done(function () {ExhibitConf.rerender()});
	    config.fail(function() {
		    component.remove();
		});
	};
    
	EE.open = function() {
	    EE.stopEdit();
	    EC.open().done(EE.beginEdit);
	};

	EE.saveAs = function() {
	    //clone(true) to copy data as well.
	    var dom = $(document.documentElement).clone(true);
	    EC.unrender(dom);
	    $('link[rel="exedit/script"]',dom).each(function() {
		    var a = dom;
		    //can't use jquery; it evaluates the scripts
		    this.parentNode
			.replaceChild($(this).data('exedit-script'),
				      this);
		});
	    dom.find('.exedit').remove();
	    EC.saveHtml(dom.html());
	};

	EE.addFacet = function() {
	    EE.addComponent($('<div ex:role="facet" class="exhibit-editable"></div>'));
	};

	EE.addView = function() {
	    EE.addComponent($('<div ex:role="view" class="exhibit-editable"></div>'));
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

	EE.stopEdit = function() {
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
	    var lens = $('[ex\\:role="lens"]',EC.win.document),
	    editContainer = EE.lensEditorTemplate.clone()
            .prependTo(EC.win.document.body).show(),
	    lensContainer = $('.lens-editor-lens-container',editContainer);

	    EE.lensEditor = ExhibitConf.createLensEditor(lens, lensContainer);

	    EE.cleanup(function () {
		    $('.lens-insert-menu').hide();
		    EE.lensEditor.stopEdit();
		    editContainer.remove();
		    ExhibitConf.rerender();
		});
	    if (lens.length === 0) {
		lens = $('<div ex\:role="lens"></div>');
	    }
	    $('#main').hide();
	    $('.lens-insert-menu').show();
	};

	EE.addLensText = function() {
	    EE.lensEditor.addText();
	};

	EE.addLensImg = function() {
	    EE.lensEditor.addImg();
	};

	EE.addLensAnchor = function() {
	    EE.lensEditor.addAnchor();
	};

	EE.beginEdit = function(data) {
	    var 
	    clean = data.replace(/<!DOCTYPE[^>]*>/,""),
	    parser = new DOMParser(),
	    script = /script/i,
	    doc = parser.parseFromString(clean, "text/html");

	    //block script execution in new doc
	    //without disturbing position
	    $('script',doc).each(function () {
		    if (script.test(this.type) || !this.type) {
			$('<link rel="exedit/script">')
			    .data("exedit-script",this)
			    .replaceAll(this);
		    }
		});

	    //can't move elements between docs so must detach first.
	    $('body',document)
	        .children()
		.not('.aloha,.aloha-ui,.aloha-ui-context,.pasteContainer')
		.remove();
	    $('body',document)
	        .prepend($('body',doc).detach().children());
	    document.title = "Exedit: " + $('title',doc).text();
	    $('head',document).empty().append($('head',doc).detach().children());

	    EE.activate();
	    ExhibitConf.reinit();
	}

	EE.newExhibit = function() {
	    EE.stopEdit();
	    $.get("blank.html", EE.beginEdit);
	}


	EE.init = function() {
	    EE.menu = $('#exedit-menu').detach()
	    .removeAttr('id');
	    EE.lensTemplate = $('#lens-template').detach()
	    .removeAttr('id').show().children();
	    EE.lensEditorTemplate = $('#lens-editor-template').detach()
	    .removeAttr('id').show();
	    EE.exhibitTemplate = $('#exhibit-template').detach()
	    .removeAttr('id').show().children();
	    EE.headStuff = $('.exedit',document.head)
	    .add('link[rel=stylesheet]'); //to get exhibit styles
	    EE.headStuff.addClass('exedit');
	    EC.unrender(EE.exhibitTemplate); //in case exhibit got there first
	};
    
	EE.visitSimile = function() {
	    window.open('http://www.simile-widgets.org/exhibit');
	}

	EE.activate = function() {
	    var menu = EE.menu.clone(),
	    spacer=$('<div class="exedit"></div>');
	    $('.lens-insert-menu',menu).hide();
	    $('.page-insert-menu',menu).hide();
	    configMenuBar(menu, 
			  {"new-button":  EE.newExhibit,
			   "open-button": EE.open,
			   "save-button": EE.saveAs,
			   "preview-button": EE.stopEdit,
			   "edit-exhibit-button": EE.editPage,
			   "edit-lens-button": EE.editLens,
			   "edit-data-button": ExhibitConf.configureData,
			   "help-button": todo,
			   "wizard-button": todo,
			   "simile-button": EE.visitSimile,
			   "add-view-button": EE.addView,
			   "add-facet-button": EE.addFacet,
			   "add-content-button": EE.addLensText,
			   "add-link-button": EE.addLensAnchor,
			   "add-img-button": EE.addLensImg
			  });
	    EE.headStuff.appendTo(EC.win.document.head);
	    menu.prependTo(EC.win.document.body);
	    spacer.height(menu.height()).prependTo(EC.win.document.body);
	};

	$(document).on("scriptsLoaded.exhibit",function() {
		var maybeSetData = function() {
		    var i, url, arg,
		    link = $('[rel="exhibit/data"]',ExhibitConf.win),
		    args = window.location.search.substr(1).split('&');

		    for (i=0; i<args.length; i++) {
			arg = args[i];
			if (arg.substr(0,4) === "data") {
			    link.attr('href',arg.substr(5));
			} else if (arg.substr(0,4) === "type") {
			    link.attr('type',arg.substr(5));
			} 
		    }
		};

		EC.win = window;
		EE.init();
		EE.activate();
		maybeSetData();
	    });
})();
