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
    
	EE.open = function() {
	    EE.preview();
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
	    var lens = $('[ex\\:role="lens"]',EC.win.document),
	    editContainer = EE.lensEditorTemplate.clone()
            .prependTo(EC.win.document.body).show(),
	    lensContainer = $('.lens-editor-lens-container',editContainer);

	    EE.lensEditor = ExhibitConf.createLensEditor(lens, lensContainer);

	    EE.cleanup(function () {
		    $('.lens-insert-menu').hide();
		    editContainer.remove();
		    EE.lensEditor.stopEdit();
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

	EE.beginEdit = function(data) {
	    var parser = new DOMParser(),
	    doc = parser.parseFromString(data, "text/html");

	    //block script execution in new doc
	    //without disturbing position
	    $('script',doc).each(function () {
		    $('<link rel="exedit/script">')
			.data("exedit-script",this)
			.replaceAll(this);
		});

	    $('body',document).empty().append($('body',doc).detach().children());
	    document.title = "Exedit: " + $('title',doc).text();
	    $('head',document).empty().append($('head',doc).detach().children());

	    EE.activate();
	    ExhibitConf.reinit();
	}

	EE.newExhibit = function() {
	    EE.preview();
	    $.get("blank.html", EE.beginEdit);
	}


	EE.createEditorIframe = function(loc) {
	    var deferred = $.Deferred(),
	    frame = $('<iframe id="page-editor-iframe" src="blank.html"></iframe>')
	    .appendTo(loc), 
	    frameBare = frame.get(0);

	    setInterval(function () {
		    //don't cache .contentWindow.document; may change during load
		    frame.height($(frameBare.contentWindow.document.body).height()+100);
		}, 100);
	    frame.load(function() {
		    deferred.resolve(frame);
		});
	    return deferred.promise();
	}

	EE.setupIframe = function(frame) {
	    var styles = [
			  "http://cdn.jsdelivr.net/alohaeditor/aloha-0.21.0/css/aloha.css",
			  "exconf.css",
			  ],
	    win = frame.get(0).contentWindow,
	    head = $(win.document.head);

	    for (i=0; i < styles.length; i++) {
		style = $('<link rel="stylesheet" class="exhibitconf-added">')
		    .attr('href', styles[i]);
		head.append(style);
	    }
	};

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
	    configMenuBar(menu, {"new-button":  EE.newExhibit,
			"open-button": EE.open,
			"save-button": EE.saveAs,
			"preview-button": EE.preview,
			"edit-exhibit-button": EE.editPage,
			"edit-lens-button": EE.editLens,
			"edit-data-button": ExhibitConf.configureData,
			"help-button": todo,
			"wizard-button": todo,
			"simle-button": EE.visitSimile,
			"add-view-button": EE.addView,
			"add-facet-button": EE.addFacet,
			"add-content-button": EE.addLensText,
			"add-link-button": todo,
			"add-img-button": EE.addLensImg
			});
	    EE.headStuff.appendTo(EC.win.document.head);
	    menu.prependTo(EC.win.document.body);
	    spacer.height(menu.height()).prependTo(EC.win.document.body);
	};

	$(document).ready(function() {
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