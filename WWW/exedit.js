ExhibitConf.Editor = {
    cleanupCallback: function() {}
};

(function () {
    var EC = ExhibitConf
    , EE = EC.Editor

    , configMenuBar = function(bar, conf) {//list of class/function pairs
        bar.on('click', 'a[class]', function () {
	    var cl = $(this).attr('class');
	    if (cl && conf[cl]) {
		conf[cl]();
	    }
	    return true; //allow propagation
	});
    }

    , todo = function() {alert('todo');};

    EE.addComponent = function(component, parent) {
	var sel, range;

	if (parent) {
	    //insert in specified node
	    parent.append(component);
	} else {
	    //insert at current selection
	    /* hack: menu access is messing selection
	       so, record selection whenever menu is accessed
	       use that recorded selection 
	    sel = EC.win.getSelection();
	    if (sel.rangeCount === 0) {
		alert('no selection!');
	    }
	    range = EC.win.getSelection().getRangeAt(0);
	    if ($(range.commonAncestorContainer)
		.parents('#main').length === 0) {
		range = EC.range;
	    }
	    */
	    range = document.createRange();
	    range.setStart(ExhibitConf.range.sc, ExhibitConf.range.so);
	    range.setEnd(ExhibitConf.range.ec, ExhibitConf.range.eo);
	    range.insertNode(component.get(0));
	}
	config = ExhibitConf.configureElement(component);
	config.done(function () {ExhibitConf.rerender()});
	config.fail(function() {
	    component.remove();
	});
    };
    
    EE.openFile = function() {
	EC.open().done(EE.beginEdit);
    };

    EE.openUrl = function(url) {
	$.ajax(url, {dataType:"text"}).done(EE.beginEdit);
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
	EE.addComponent($('<div ex:role="facet"></div>')
			.attr( 'class','exhibit-editable'));
    };

    EE.addView = function() {
	EE.addComponent($('<div ex:role="view"></div>')
			.attr( 'class','exhibit-editable'));
    };
    
    //let an invoked state specify what should happen when we 
    //transition to a different state.
    EE.cleanup = function(callback) {
	if (EE.cleanupCallback) {
	    EE.cleanupCallback();
	}
	EE.cleanupCallback = callback;
    };

    EE.stopEdit = function() {
	EE.cleanup();
	$('#main').show();
    };

    EE.preview = function() {
	EE.stopEdit();
	ExhibitConf.rerender();
    };

    EE.startEdit = function() {
        EE.cleanup(function () {
            ExhibitConf.stopEditData();
        });
        ExhibitConf.startEditData();
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

    // replace current contents being edited with a new document
    EE.insertDoc = function(data) {
	var 
	clean = data.replace(/<!DOCTYPE[^>]*>/,""),
	parser = new DOMParser(),
	script = /script/i,
	doc = parser.parseFromString(clean, "text/html");

	EE.stopEdit();

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
	$('head',document).empty().append($('head',doc).detach().children());
	document.title = "Exedit " + $('title',doc).text();
	};

    EE.newExhibit = function() {
	EE.openUrl("blank.html");
    };

    EE.beginEdit = function(data) {
	EE.insertDoc(data);
	EE.activate();
	ExhibitConf.reinit();
    }

    EE.init = function() {
	EE.menu = $('#exedit-menu').detach();
	EE.lensTemplate = $('#lens-template').detach()
	    .removeAttr('id').show().children();
	EE.lensEditorTemplate = $('#lens-editor-template').detach()
	    .removeAttr('id').show();
	EE.exhibitTemplate = $('#exhibit-template').detach()
	    .removeAttr('id').show().children();
	EE.headStuff = $('.exedit',document.head)
	    .add('link[rel=stylesheet]'); //to get exhibit styles
	EE.headStuff.addClass('exedit');
	ExhibitConf.win = window;
	$('head').empty().append('<title>Exedit</title>');
    };
    
    EE.visitSimile = function() {
	window.open('http://www.simile-widgets.org/exhibit');
    }

    EE.activate = function() {
	var menu = EE.menu.clone();
	configMenuBar(menu, 
		      {"new-button":  EE.newExhibit,
		       "open-button": EE.openFile,
		       "save-button": EE.saveAs,
		       "preview-button": EE.stopEdit,
		       "edit-exhibit-button": EE.editPage,
		       "edit-lens-button": EE.editLens,
		       "edit-links-button": ExhibitConf.configureData,
		       "edit-data-button": ExhibitConf.startEditData,
		       "help-button": todo,
		       "wizard-button": todo,
		       "simile-button": EE.visitSimile,
		       "add-view-button": EE.addView,
		       "add-facet-button": EE.addFacet,
		       "add-content-button": EE.addLensText,
		       "add-link-button": EE.addLensAnchor,
		       "add-img-button": EE.addLensImg
		      });
	spacer=$('<div class="exedit"></div>');
	$('.lens-insert-menu',menu).hide();
	$('.page-insert-menu',menu).hide();
	EE.headStuff.appendTo(EC.win.document.head);
	menu.prependTo(EC.win.document.body);
	spacer.height(menu.height()).insertAfter(menu);
    };

    if (console) {
	console.log('waiting');
	}
    $(document).on("scriptsLoaded.exhibit",function() {
	var parseUrlArgs = function() {
	    var args = window.location.search.substr(1).split('&')
	    , arg, split, result={};

	    for (i=0; i<args.length; i++) {
		arg = args[i];
		split = arg.indexOf('=');
		key = arg.slice(0,split);
		val = arg.slice(split+1);

		if (split >= 0) {//there is a key
		    result[key] = val;
		}

		}
	    return result;
	    }

	, setDataLink = function(url,type) {
	    var i, url, arg
	    , newLink = $('<link rel="exhibit-data"/>')
		.attr('href',url)
		.attr('type',type || 'application/json')
	    , links = $('link[rel="exhibit-data"]',ExhibitConf.win.document);
	    
	    if (links.length>0) {
		links.eq(0).before(newLink).remove();
		} else {
		    $('head',ExhibitConf.win).append(newLink);
		}
	}
	, urlArgs = parseUrlArgs();

	EE.init();

	$.ajax(urlArgs.page || "blank.html", {dataType: "text"})
	    .done(function(data) {
		    EE.insertDoc(data);
		    if (urlArgs.data) {
			setDataLink(urlArgs.data, urlArgs.type);
		    }
		    EE.activate();
		    ExhibitConf.reinit();
		})
	    });
})();
