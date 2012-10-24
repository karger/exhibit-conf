/*global $, Exhibit, ExhibitConf, alert, DOMParser, console, Aloha*/

ExhibitConf.Editor = {
    cleanupCallback: function() {}
};

(function () {
    var EC = ExhibitConf
    , EE = EC.Editor

    //conf is a mapping from classes (in bar) to functions
    , configureMenuBar = function(bar, conf) {
        /* 
           Menu interaction messes up the selection.  So it's
           important to save the selection before menu interaction and
           restore after.  I'm having some bizarre problems saving
           ranges: even when I use cloneRange() which supposedly
           copies by value the cloned range ends up mutating as
           selection changes.  So, hack, manually clone the range.
        */

        bar.on('click', 'span[class]', function (e) {
            EC.restoreRange();
            var cl = $(this).attr('class');
            if (cl && conf[cl]) {
                conf[cl]();
            }
            return false; //prevent propagation
        });
        //something in menu interaction destroys (even cloned) ranges
        //so we need a contorted save-by-value method
        bar.mouseenter(EC.saveRange)
            .mouseleave(EC.restoreRange);
    }

    , todo = function() {alert('todo');};

    EE.addComponent = function(component, parent) {
        EC.saveRange();
        EC.configureElement(component).done(function () {
            var range = EC.getRange();
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
                //range = EC.getRange()
                range.deleteContents();
                range.insertNode(component.get(0));
                range.detach();
            }
            component.alohaBlock();
            EC.rerender();
        });
    };
    
    EE.openFile = function() {
        EC.open().done(EE.beginEdit);
    };

    EE.openUrl = function(url) {
        $.ajax(url, {dataType:"text"}).done(EE.beginEdit);
    };

    EE.exhibitToHtml = function (doc) {
        var dom, body;

        EE.preview();  //clean up any current editing
        dom = $((doc || document).documentElement).clone(true);
        body = dom.find('#page-container').detach();
        dom.find('body').empty().append(body.children());
        EC.unrender(dom);
        dom.find('.exedit').remove();
        $('link[rel="exedit/script"]',dom).each(function() {
            //can't use jquery; it evaluates the scripts
            this.parentNode
                .replaceChild($(this).data('exedit-script'),
                              this);
        });
        return '<html>' + dom.html() + '</html>';
    }

    EE.pageToWeb = function(doc) {
        var dom = EE.ExhibitToHtml();
    };
    
    EE.saveAs = function(d) {
        //clone(true) to copy data as well.
        var html = EE.exhibitToHtml()
            .replace(/(<\/[a-z]*>)/g,'$1\n')  // 'prett print'
        , uri = "data:application/octet-stream;charset=utf-8,"
            + encodeURIComponent('<html>'+html+'</html>');
        window.open(uri,"_blank");
    };

    EE.addViewPanel = function() {
        EE.addComponent($('<div ex:role="viewPanel"></div>')
                        .attr( 'class','exhibit-editable'));
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
        EE.bodyContainer.show();
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
            ExhibitConf.stopEditPage(EE.bodyContainer);
            ExhibitConf.rerender();
        });
        EE.bodyContainer.show();
        $('.page-insert-menu').show();
        ExhibitConf.rerender();
        ExhibitConf.startEditPage(EE.bodyContainer);
    };
    
    EE.lensEditor = {};
    EE.editLens = function() {
        var lens = $('[ex\\:role="lens"]',EC.win.document)
        , editContainer = EE.lensEditorTemplate.clone()
        , lensContainer = $('.lens-editor-lens-container',editContainer);

        EE.cleanup(function () {
            $('.lens-insert-menu').hide();
            $(EE.bodyContainer).show();
            EE.lensEditor.stopEdit();
            editContainer.remove();
            ExhibitConf.rerender();
        });

        editContainer.prependTo(EC.win.document.body).show();
        EE.lensEditor = ExhibitConf.createLensEditor(lens, lensContainer);

        if (lens.length === 0) {
            lens = $('<div ex:role="lens"></div>');
        }
        EE.bodyContainer.hide();
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

    EE.editData = function() {
        EE.cleanup(function () {
            ExhibitConf.stopEditData();
        });
        ExhibitConf.startEditData();       
    };

    // replace current contents being edited with a new document
    EE.insertDoc = function(html) {
        var 
        clean = html.replace(/<!DOCTYPE[^>]*>/,""),
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
        EE.bodyContainer.empty()
            .prepend($('body',doc).detach().children());
        document.title = "Exedit " + $('title',doc).text();
        $('head',document).empty()
            .append($('head',doc).detach().children());
    };

    EE.newExhibit = function() {
        EE.openUrl("blank.html");
    };

    EE.tutorial = function() {
        window.open("http://people.csail.mit.edu/karger/EConf/exedit.html?page=tutorial.html");
    };

    EE.beginEdit = function(data) {
        EE.insertDoc(data);
        EE.activate();
        ExhibitConf.reinit();
    };

    EE.init = function() {
        EE.menu = $('#exedit-menu').detach().show();
        EE.bodyContainer = $('#page-container');
        EE.lensEditorTemplate = $('#lens-editor-template').detach()
            .removeAttr('id').show();
        EE.headStuff = $('.exedit',document.head)
            .add('link[rel=stylesheet]'); //to get exhibit styles
        EE.headStuff.addClass('exedit'); 
        $('head').empty().append('<title>Exedit</title>');
        ExhibitConf.win = window;

        Aloha.require(['ui/ui', 'ui/button'], function(Ui, Button) {
                Ui.adopt("addFacet", Button, {
                        text: "add facet",
                        click: EE.addFacet
                    });
                Ui.adopt("addView", Button, {
                        text: "add view",
                        click: EE.addView
                    });
                Ui.adopt("addViewPanel", Button, {
                        text: "add view panel",
                        click: EE.addViewPanel
                    });
            });
    };
    
    EE.visitSimile = function() {
        window.open('http://www.simile-widgets.org/exhibit');
    };

    EE.activate = function() {
        var menu = EE.menu.clone()
        , spacer=$('<div class="exedit"></div>');
        configureMenuBar(menu, 
                      {"new-button":  EE.newExhibit,
                       "open-button": EE.openFile,
                       "save-button": EE.saveAs,
                       "preview-button": EE.stopEdit,
                       "edit-exhibit-button": EE.editPage,
                       "edit-lens-button": EE.editLens,
                       "edit-links-button": ExhibitConf.editDataLinks,
                       "edit-data-button": EE.editData,
                       "help-button": todo,
                       "tutorial-button": EE.tutorial,
                       "wizard-button": todo,
                       "simile-button": EE.visitSimile,
                       "add-view-button": EE.addView,
                       "add-facet-button": EE.addFacet,
                       "add-content-button": EE.addLensText,
                       "add-link-button": EE.addLensAnchor,
                       "add-img-button": EE.addLensImg
                      });
        $('.lens-insert-menu',menu).hide();
        $('.page-insert-menu',menu).hide();
        EE.headStuff.appendTo(EC.win.document.head);
        menu.prependTo(EC.win.document.body);
        spacer.height(menu.height()).insertAfter(menu);
    };

    $(document).on("scriptsLoaded.exhibit",function() {
        var parseUrlArgs = function() {
            var args = window.location.search.substr(1).split('&')
            , i, arg, split, key, val, result={};

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
            var i, arg
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
            .fail(function() {
                alert("Failed to load " + (urlArgs.page || "blank.html"));
            });
    });
}());
