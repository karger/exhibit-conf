/*global ExhibitConf: true, Exhibit, FileReader, $, console, Aloha*/

//Configuration of editor
ExhibitConf = {};

/*Utility functions */
(function () {
    var EC = ExhibitConf;

    EC.unrender = function(dom) {
        dom = $(dom || EC.win.document);
        dom.find('.exhibit-controlPanel').remove();
        dom.find('.exhibit-toolboxWidget-popup').remove();
        dom.find('[ex\\:role="facet"]').empty().removeClass('exhibit-facet');
        dom.find('[ex\\:role="view"]')
            .removeClass('exhibit-view')
            .children()
            .not('[ex\\:role]')
            .remove();
        dom.find('[ex\\:role="viewPanel"]')
            .children()
            .not('[ex\\:role]')
            .remove();
        dom.find('.exconf-no-id').removeAttr('id');
    };

    EC.rerender = function(win) {
        win = win || EC.win;
        EC.unrender(win.document);
        if (win.Exhibit && win.Exhibit.History.enabled) {
            win.Exhibit.History.eraseState();
            }
        if (win.exhibit._uiContext) {
            //sledgehammer to clear old state
            win.exhibit._uiContext =
                Exhibit.UIContext.createRootContext({},win.exhibit);
        }
        win.exhibit._collectionMap = {};
        win.exhibit.configureFromDOM();
    };

    EC.reinit = function(win) {
        var killFacets = function(w) {
            var i
            , facets = w && w.exhibit && w.exhibit.getUIContext
                && w.exhibit.getUIContext().getCollection()._facets;
            
            if (facets) {
                for (i=0; i<facets.length; i++) {
                    facets[i].dispose();
                }
            }
        };

        win = win || EC.win;
        killFacets(win);
        EC.unrender(win.document);
        if (win.Exhibit.History.enabled) {
            win.Exhibit.History.eraseState();
            }
        $(document).one('dataload.exhibit',function() {
            //need to set proper 'this" on configure call
            //so can't just pass configureFromDOM to loadLinks
            win.exhibit.configureFromDOM();
        });
        win.database.loadLinks();
    };

    EC.open = function() {
        var deferred = $.Deferred(),
        input = $('<input type="file"></input>');

        input.change(function(evt) {
            var file = evt.target.files[0],
            reader = new FileReader();
            reader.onload = function() {
                deferred.resolve(reader.result);
            };
            reader.readAsText(file);
        });
        input.click();
        return deferred.promise();
    };

    EC.saveHtml = function(html) {
        var uri;

        html = html.replace(/(<\/[a-z]*>)/g,'$1\n'); //'pretty print'
        uri = "data:application/octet-stream;charset=utf-8,"
            + encodeURIComponent('<html>'+html+'</html>');
        window.open(uri,"_blank");
    };
}());


/* utility for choosing an expression (common case: existing db property)*/
ExhibitConf.exprSelector = function (props) {
    var
    selector = $('<select></select>')
    , input = $('<input type="textfield">').hide()
    , box = $('<input type="checkbox">')
    , advanced = $('<div>Advanced expression: </div>').append(box)
    , container = $('<div></div>').append(selector)
        .append(input).append(advanced);

    props = props || ExhibitConf.win.database.getAllProperties();

    box.change(function() {
        selector.toggle();
        input.toggle();
    });
    $('<option></option>').text('(none)').attr('value','')
        .appendTo(selector);
    $.each(props, function(i, p) {
        $('<option></option>').text(p).attr('value','.'+p)
            .appendTo(selector);
    });

    container.val = function(set) {
        if (arguments.length === 0) {
            return box.is(':checked') ?
                input.val() :
                selector.val();
        } else {
            input.val(set);
            if (props.indexOf(set) === -1) {
                $('<option></option>').text(set.substr(1))
                    .attr('value',set)
                    .appendTo(selector);
            }
            selector.val(set);
        }
    };

    container.change = function(handler) {
        box.change(handler);
        selector.change(handler);
        input.change(handler);
        return container;
    };
    return container;
};

/* Widget configurator */
(function () {
    var EC = ExhibitConf
    , initialized = false
    , settingSpecs = {
        
        views: {
            "TileView": {label: "List", 
                         superclassName: "OrderedViewFrame",
                         specs: {
                             orders: "text",
                             possibleOrders: "text"
                             }
                        },
            "ThumbnailView": {superclassName: "OrderedViewFrame"},
            "TimelineView": {
                specs: {
                    "start": {type: "expr"},
                    "end": {type: "expr"},
                    "colorKey": {type: "expr"},
                    "iconKey": {type: "expr"},
                    "eventLabel": {type: "expr"},
                    "caption": {type: "text"}
                }
            }
        },

        facets: {
            "ListFacet": {label: "List",
                          specs: {"expression": {type: "expr", 
                                                 defaultValue: ""}}},
            "CloudFacet": {label: "Tag Cloud",
                           specs: {"expression": {type: "expr", 
                                                  defaultValue: ""}}},
            "NumericRangeFacet": {label: "Numeric Range",
                                  specs: {"expression": {type: "expr", 
                                                         defaultValue: ""}}},
            "HierarchicalFacet": {label: "Hierarchical List",
                                  specs: {"expression": {type: "expr", 
                                                         defaultValue: ""}}},
            "TextSearchFacet": {label: "Text Search", 
                                specs: {"expressions": {type: "expr", 
                                                        defaultValue: ""}}},
            "AlphaRangeFacet": {label: "Alphabetical Range",
                                specs: {"expression": {type: "expr", 
                                                       defaultValue: ""}}}
        }
    }

    , configureSettingSpecs = function() {

        var className,

        configureOne = function(comp, className, classFinder) {
            var humanize = function(str) {
                return  str.split(/\?=[A-Z]/g).join(' ');
            };

            comp.className = className;
            if (!comp.label) {
                comp.label = humanize(className);
            }
            if (!comp.specs) {
                comp.specs = {};
            }
            if (classFinder(className)) {
                $.extend(comp.specs, classFinder(className)._settingSpecs);
            }
            if (comp.superclassName === "OrderedViewFrame") {
                //hack for subclassed views!
                $.extend(true, comp.specs, 
                              EC.win.Exhibit.OrderedViewFrame._settingSpecs);
            }
        };

        for (className in settingSpecs.views) {
            if (settingSpecs.views.hasOwnProperty(className)) {
                configureOne(settingSpecs.views[className],
                             className,
                             EC.win.Exhibit.UI.viewClassNameToViewClass);
            }
        }              

        for (className in settingSpecs.facets) {
            if (settingSpecs.facets.hasOwnProperty(className)) {
                configureOne(settingSpecs.facets[className],
                             className,
                             EC.win.Exhibit.UI.facetClassNameToFacetClass);
            }
        }
    }

    , nameAttribute = function(elmt, name) {
        elmt = $(elmt);

        if (elmt.attr(name) !== undefined) {
            return name;
        } else if (elmt.attr("data-ex-" + name)) {
            return "data-ex-" + name;
        } else {
            return "ex:" + name;
        } 
    }

    , makeSettingsTable = function(specs, settings) {

        var field,
        table = $('<table></table>'),

        inputBuilder = function(field) {
            var row = $('<tr></tr>'),
            inputHolder = $('<td></td>'),
            value = specs[field].defaultValue,
            updater = function() {
                settings[field] = $(this).val();
            },

            boolUpdater = function() {
                settings[field] = $(this).is(':checked');
            },
            boolInput = function(state) {
                if (state) {
                    return $('<input type=checkbox checked></input>');
                } else {
                    return $('<input type=checkbox></input>');
                }
            },
            textInput = function(state) {
                var inp =$('<input type="textfield"></input>');
                if ((state !== undefined) && (state !== null)) {
                    inp.val(state);
                }
                return inp;
            },
            intInput = function(state) {
                var inp =$('<input type="textfield" size=5></input>');
                if ((state !== undefined) && (state !== null)) {
                    inp.val(state);
                }
                return inp;
            },
            enumInput = function(values, state) {
                var i, choices = $('<select></select>'),
                optionElt = function(val, text) {
                    text = text || val;
                    return $('<option></option>').val(val).text(text);
                };

                for (i = 0; i < values.length; i++) {
                    optionElt(values[i]).appendTo(choices);
                }
                if (state) {choices.val(state);}
                return choices;
            },
            exprInput = function(state) {
                var inp = ExhibitConf.exprSelector(EC.win.database
                                                   .getAllProperties());
                if (state) {inp.val(state);}
                return inp;
            };

            if (settings.hasOwnProperty(field)) {
                value = settings[field];
            }
            switch (specs[field].type) {
            case 'text':
                inputHolder.append(textInput(value).change(updater));
                break;
            case 'int':
                inputHolder.append(intInput(value).change(updater));
                break;
            case 'boolean':
                inputHolder.append(boolInput(value).change(boolUpdater));
                break;
            case 'enum':
                inputHolder.append(enumInput(specs[field].choices,
                                             value)
                                   .change(updater));
                break;
            case 'expr':
                inputHolder.append(exprInput(value).change(updater));
                break;
            default:
                return $();
            }

            $('<td></td>').text(field).appendTo(row);
            inputHolder.appendTo(row);
            row.data('field',field);
            return row;
        }; //inputBuilder

        for (field in specs) {
            if (specs.hasOwnProperty(field)) {
                table.append(inputBuilder(field, settings[field]));
            }
        }

        return table;
    }

    //create a dialog that destructively modifies exhibit component settings
    , settingsDialog = function(comp, title, settings) {
        var className,
        deferred = $.Deferred(),
        //dummy tab is a hack due to tabs oddness: select event is not called
        //on initial (selected) tab, which prevents it initializing properly
        parts = $('<div><ul><li><a href="#dummy">dummy</a></li></ul><div id="dummy"></div></div>'),
        dialog = $('<div></div>').append(parts);

        parts.tabs({
            'add': function(event, ui) {
                $(ui.tab).data("class-name",className);
                return true;
            }});

        for (className in settingSpecs[comp]) {
            if (settingSpecs[comp].hasOwnProperty(className)) {
                parts.tabs("add", '#' + comp + '-' + className,
                           settingSpecs[comp][className].label);
            }
        }

        parts.tabs({'select': function(event, ui) {
            settings.className = $(ui.tab).data("class-name");
            $(ui.panel).empty()
                .append(
                    makeSettingsTable(settingSpecs[comp][settings.className].specs,
                                      settings));
            return true;
        }});
        
        parts.tabs('select','#' + comp + '-' + settings.className);
        parts.tabs('remove',0); //remove dummy tab once all else initialized
        dialog.dialog({
            "zIndex": 10101, //cover aloha toolbar
            "buttons": {
                "Update": function() {
                    dialog.dialog('close');
                    deferred.resolve(settings);
                },
                "Cancel": function () {
                    dialog.dialog('close');
                    deferred.reject();
                }
            },
            "modal": true, 
            "title": title,
            "width": "550"
        });
        return deferred.promise();
    };

    EC.configureElement = function(elt) {
        var specs, cleanSpecs, comp, className, title, field, eField, promise,
        settings = {},
        role = EC.win.Exhibit.getRoleAttribute(elt);

        switch(role) {
        case "view": 
            comp = "views";
            title = "Configure View";
            className = EC.win.Exhibit.getAttribute(elt,"viewClass") 
                || "TileView";
            if (!className.endsWith("View")) {
                className += "View";
                }
            break;
        case "facet":
            comp = "facets";
            title = "Configure Facet";
            className = EC.win.Exhibit.getAttribute(elt,"facetClass") 
                || "ListFacet";
            if (!className.endsWith("Facet")) {
                className += "Facet";
                }
            break;
        case "viewPanel":
            //special case; don't use component handler code
            return EC.configureViewPanel(elt);
        }
        
        if (!initialized) {
            configureSettingSpecs();
            initialized=true;
        }

        specs = settingSpecs[comp][className].specs;
        cleanSpecs = $.extend(true, {}, specs);
        for (field in cleanSpecs) {
            if (cleanSpecs.hasOwnProperty(field) &&
                (cleanSpecs[field].type === 'expr')) {
                cleanSpecs[field].type='text';
                }
        }
        EC.win.Exhibit.SettingsUtilities.collectSettingsFromDOM(elt, cleanSpecs, settings);

        settings.className = className;
        promise = settingsDialog(comp, title, settings);

        promise.done(function () {
            //settings have been updated; push to element.  preserves 
            //non-conflicting settings; useful if switch back to
            //previous facet/view class.
            var field, eField;

            //reset to settings for new class
            specs = settingSpecs[comp][settings.className].specs;
            if (comp === 'facets') {
                elt.attr('ex:facetClass',settings.className);
            } else if (comp === 'views') {
                elt.attr('ex:viewClass',settings.className);
            }
            delete settings.className; //so won't make an attribute
            for (field in specs) {
                if (specs.hasOwnProperty(field)) {
                    eField = nameAttribute(comp,field);
                    if (typeof(settings[field]) === 'undefined'
                        || settings[field] === specs[field].defaultValue) {
                        elt.removeAttr(eField);
                    } else {
                        elt.attr(eField, settings[field]);
                    }
                }
            }
        });
        return promise;
    };

    EC.configureViewPanel = function(panel) {
        var 
        deferred = $.Deferred()
        , views = panel.find('[ex\\:role="view"]')
        , viewCount = views.length
        , whichView = $('<select class="initial-view"></select>')
        , viewList = $('<table class="view-list"/>')
            .sortable({axis: "y",
                       items: "tr"})
        , setCount = function(count) {
            var i, val = whichView.val() || 0;
            whichView.empty();
            for (i=0; i<count; i++) {
                $('<option value="'+i+'"/>').text(i).appendTo(whichView);
            }
            whichView.val(val < count? val : 0);
        }
        , makeViewEntry = function(view) {
            var entry = $('<tr class="exconf-view"/>').data('exconf-view',view)
            , className = Exhibit.getAttribute(view, "viewClass")
            , label = Exhibit.getAttribute(view,"viewLabel") ||
                Exhibit.getAttribute(view,"label") ||
                Exhibit.ViewPanel.getViewLabel(className) ||
                className ||
                Exhibit._("%viewPanel.noViewLabel")
            , remove = $('<input type="button"/>')
                .val("Remove")
                .click(function() {
                    entry.remove();
                    setCount(--viewCount);
                });
            $('<td>\u00BB</td>').appendTo(entry);
            $('<input type="textfield">').val(label)
                .appendTo('<td/>').parent().appendTo(entry);
            $('<td/>').append(remove).appendTo(entry);
            return entry;
        }
        , addView = function() {
            viewList.append(makeViewEntry($('<div ex:role="view" ex:viewClass="TileView" class="exhibit-editable"></div>')));
            setCount(++viewCount);
        }
        , addViewButton = $('<input type="Button"/>')
            .val('Add View')
            .click(addView)
        , dialog = $('<div/>').text('Drag views by >> to reorder')
        , save = function() {
            dialog.dialog("close");
            views.detach(); //remove them all
            viewList.find('.exconf-view').each(function() {
                var jq = $(this)
                , label = jq.find('input').val()
                , view = jq.data('exconf-view');
                $(view).attr('ex:label',label).appendTo(panel);
                //then put back those we're keeping (plus new)
            });
            if (whichView.val()) {
                panel.attr('ex:initialView',whichView.val());
            } else {
                panel.removeAttr('ex:initialView');
            }
            deferred.resolve();
        };

        setCount(views.length);
        dialog.empty();
        dialog.text('Drag views to reorder.  Set a label for each view.');
        $('<div>Choose initial view number:</div>')
            .append(whichView)
            .appendTo(dialog);
        views.each(function() {
            viewList.append(makeViewEntry(this));
        });
        dialog.append(viewList)
            .append(addViewButton);
        dialog.dialog({
            title: 'Edit View Panel',
            width: 600,
            minWidth: 380,
            height: 400,
            modal: true, 
            buttons: {
                "Save": save,
                "Cancel": function() { 
                    $(this).dialog('destroy');
                    deferred.reject();
                }
            },
            "zIndex": 10101 //cover aloha toolbar
        });

        return deferred.promise();
    };
}());

/* page editor */
(function () {
    var EC = ExhibitConf

    , findFacet = function (elt,win) {
        var i, 
        collection = (win||EC.win).exhibit.getUIContext().getCollection(),
        facets = collection._facets;

        elt = elt.get(0);
        for (i=0; i<facets.length; i++) {
            if (facets[i]._dom.elmt.get(0) === elt) {
                return facets[i];
            }
        }
        if (console && console.log) {
            console.log("can't find facet!");
        }
    }

    , markExhibit = function(dom) {
        dom = $(dom || EC.win.document.body);
        $('[ex\\:role="view"]',dom).addClass('exhibit-editable');
        $('[ex\\:role="facet"]',dom).addClass('exhibit-editable');
        $('[ex\\:role="viewPanel"]',dom).addClass('exhibit-editable');
        //weird things happen if ids get added after rendering
        //unfortunately, aloha sometimes does that.
        //preclude by arranging to remove them
        $('[ex\\:role]',dom).filter(':not([id])').addClass('exconf-no-id');
    }

    , unMarkExhibit = function(dom) {
        dom = $(dom || EC.win.document.body);
        $('[ex\\:role="view"]',dom).removeClass('exhibit-editable');
        $('[ex\\:role="facet"]',dom).removeClass('exhibit-editable');
        $('[ex\\:role="viewPanel"]',dom).removeClass('exhibit-editable');
    }

    , handleEditClick = function(event) {
        var widget = $(event.target).parents('.exhibit-edit-tab')
        , elt = widget.parent();

        widget.detach();
        //click causes event to trigger twice; not sure why.
        event.stopImmediatePropagation();
        EC.configureElement(elt).done(function () {
            var f;
            if (EC.win.Exhibit.getRoleAttribute(elt) === 'facet') {
                f = findFacet(elt);
                if (f) {
                    f.dispose();
                }
            }
            EC.rerender();
        });
    }
    , handleDeleteClick = function(event) {
        var widget = $(event.target).parents('.exhibit-edit-tab')
        , elt = widget.parent();

        event.stopImmediatePropagation();
        widget.detach();
        elt.mahaloBlock();
        elt.detach();
        EC.rerender();
    }
    , editButton = $('<button>Edit</button>')
    , deleteButton =  $('<button>Delete</button>')
    , editWidget = $('<div class="exhibit-edit-tab"/>')
        .append(editButton)
        .append(deleteButton)
    
    , showEditWidget = function (e) {
        //quick hack: set parent css so edit button absolute positioning
        //is relative to parent

        //don't rely on bubbling, because I'd have to stop
        //propagation which could break other mouseovers
        var parents = $(e.target).parents('.exhibit-editable')
        , realTarget = parents.length > 0 ?
            parents.eq(0) : $(e.target)
        , role = Exhibit.getRoleAttribute(realTarget.get(0));
        editWidget.detach();
        //need to raeattach events because aloha is removing them
        editButton.on('click.exconf',handleEditClick);
        deleteButton.on('click.exconf',handleDeleteClick);
        editButton.text('Edit ' + role);
        deleteButton.text('Delete ' + role);
        $(realTarget).css('position','relative').prepend(editWidget);
    };

    editWidget.children().wrap('<div/>'); //stacked layout

    EC.startEditPage = function(dom) {
        markExhibit();
        //      $(EC.win.document.body)
        //          .wrapInner('<div class="exhibit-wrapper"></div>');
        dom.addClass('exhibit-editing');
        $('.exhibit-editable',dom).alohaBlock();
        $('.exhibit-editable',dom)
            .after('<div class="exconf-whitespace">&nbsp;</div>')
            .before('<div class="exconf-whitespace">&nbsp;</div>');
        dom.aloha();
        //alohaBlock "cleans up" html and destroys events bound to it
        //so necessary to rerender after alohaBlock calls
        //better plan: alohaBlock once before editing begins
        //so rerendering doesn't happen here
        EC.rerender();
        dom.on('mouseover','.exhibit-editable', showEditWidget);
    };

    EC.stopEditPage = function (dom) {
        dom.removeClass('exhibit-editing')
            .off('mouseover','.exhibit-editable',showEditWidget);
        deleteButton.off('click.exconf');
        editButton.off('click.exconf'); //remove since re-add
        dom.mahalo();
        $('.exhibit-editable',dom).mahaloBlock();
        $('.exconf-whitespace',dom).each(function() {
            var jq = $(this);
            if (jq.text() === '&nbsp;') {
                jq.remove();
            }
            else {
                jq.contents().unwrap();
            }
        });
        //            $('.exhibit-wrapper').children().unwrap();
        unMarkExhibit();
        EC.rerender();
    };
}());

/* Data Link Editor */

ExhibitConf.dataMimeTypes = [];
ExhibitConf.editDataLinks = function() {
    var EC = ExhibitConf
    , selectMimes = function() {
        var importers=Exhibit.Importer._registry.getKeys(
            Exhibit.Importer._registryKey)
        , options=$('<select></select>')
        , i;

        for (i=0; i<importers.length; i++) {
            $('<option/>').text(importers[i]).appendTo(options);
        }
        return options;
    }

    , saveLinks = function() {
        $("link[rel=exhibit-data]").remove();
        $('.linkFields',this).find("tr").slice(0,-1).each(function() {
            var parts=$(this).find("td")
            , href=parts.eq(0).children().val().trim()
            , type=parts.eq(1).children().val();
            if (href) {
                $('<link rel="exhibit-data">')
                    .attr('href',href)
                    .attr('type',type)
                    .appendTo('head');
            }
        });
        $(this).dialog('close');
        EC.reinit();
    }

    , editLinks = function() {
        var linkFields=$('.linkFields',EC.dataDialog)
        , killMe=function() {
            $(this).parent().parent().remove();
        }
        , button=$('<input type="button">').val("remove")
            .click(killMe).wrap("<td></td>").parent()
        , addBlankLine = function() {
            var field = $('<input type="textfield" value="">')
            , unBlank = function () {
                field.parent().parent().append(button.clone(true));
                addBlankLine();
                field.unbind('keydown',unBlank);
            };
            field.keydown(unBlank);
            field.wrap("<td>").parent().wrap("<tr>").parent()
                .append(EC.dataMimeTypes.clone()
                        .val("application/json")
                        .wrap("<td>").parent())
                .appendTo(linkFields);
        };

        linkFields.empty();
        $('link[rel="exhibit-data"]')
            .each(function() {
                var val= $('<input type="textfield"></input>')
                    .val($(this).attr('href'))
                    .wrap("<td>").parent().wrap("<tr>").parent()
                    .append(
                        EC.dataMimeTypes.clone()
                            .val($(this).attr("type"))
                            .wrap("<td>").parent())
                    .append(button.clone(true));
                linkFields.append(val);
            });
        addBlankLine();
        EC.dataDialog.dialog('open');
    }

    , init = function() {
        if (EC.dataMimeTypes.length > 0) {
            return;
        }
        EC.dataMimeTypes=selectMimes();

        EC.dataDialog = $('<div><table class="linkFields"></table></div>');
        EC.dataDialog.dialog({
            title: 'Edit Data Links',
            autoOpen: false,
            width: 600,
            minWidth: 380,
            height: 300,
            modal: true, 
            buttons: {
                "Save": saveLinks,
                "Cancel": function() { 
                    $(this).dialog('close');
                }
            },
            "zIndex": 10101 //cover aloha toolbar
        });
    };


    init();
    editLinks();
};

/* Lens Editor */

ExhibitConf.createLensEditor = function(lens, lensContainer) {
    //lensContainer should be in exhibit document, to inherit styles etc.
    var EC = ExhibitConf,
    editor = {},
    props = EC.win.database.getAllProperties(),
    
    alohaEditor = Aloha.jQuery(lensContainer.get(0)).empty(),
    cleanAlohaEditor = function() {
        //          for future, use Aloha api
        //          var edited = editor.children().eq(0),
        //          editId = edited.attr('id'),
        //          content = Aloha.getEditableById(editId).getContents(true);

        //          var copy = editor.clone();
        //          copy.removeAttr('contenteditable');
        //              .removeClass('aloha-editable aloha-editable-active')
        return alohaEditor.html();
    },

    timer = null,

    updateLens = function() {
        lens.empty().append(cleanAlohaEditor());
        EC.rerender();
    },

    deferredUpdateLens = function() {
        clearTimeout(timer);
        timer = setTimeout(updateLens,200);
    },

    createChangeTracker = function(signature, handler, period) {
        //invoke the returned function to deactivate the watcher
        var current = signature(),
        checkChange = function() {
            var next=signature();
            if (next !== current) {
                current = next;
                handler();
            }
        },
        timer = setInterval(checkChange, period || 100);
        return {
            dispose: function() {
                clearInterval(timer);
            }
        };
    },
    tracker = createChangeTracker(cleanAlohaEditor, deferredUpdateLens),

    editContent = function(content, attr) {
        var 
        deferred = $.Deferred(),
        dialog = $('<div><div>Property to use:</div></div>'),
        selector = EC.exprSelector(props);

        attr = attr || 'ex:content';

        if (content.attr(attr)) {
            selector.val(content.attr(attr));
        }
        dialog.append(selector);
        dialog.dialog({"buttons": {
            "OK": function() {
                dialog.dialog('close');
                content.attr(attr,selector.val());
                deferred.resolve(content);
            },
            "Cancel": function () {
                dialog.dialog('close');
                deferred.reject();
            }
        },
                       "modal": true, 
                       "title": "Choose Field Content",
                       "width": "550",
                       zIndex: 10101 //cover aloha toolbar
                      });
        return deferred.promise();
    },

    addNode = function(node, attr) {
        //remember/restore range since interaction w/dialog clears it
        //range = Aloha.getSelection(EC.win).getRangeAt(0), 
        var range = EC.win.getSelection().getRangeAt(0).cloneRange()
        , insertNodeContent = function() {
            range.insertNode(node.get(0));
        };
        editContent(node,attr).done(insertNodeContent);
    };

    editor.addAnchor = function() {
        var node = $('<a/>').text('new link');
        addNode(node,'ex:href-content');
    };

    editor.addImg = function() {
        addNode($('<img/>'),'ex:src-content');
    };

    editor.addText = function() {
        addNode($('<span/>'),'ex:content');
    };

    editor.stopEdit = function() {
        tracker.dispose(); 
        alohaEditor.mahalo();
        alohaEditor.empty();
        lensContainer.removeClass('lens-edit-lens-container');
    };

    lensContainer.addClass('lens-edit-lens-container');
    $(lens)
        .contents().clone()
        .appendTo(alohaEditor.empty());
    alohaEditor.aloha();
    alohaEditor.on('click','[ex\\:content]',function() {
        editContent($(this));
    });
    alohaEditor.on('click','img[ex\\:src-content]',function() {
        editContent($(this),'ex:src-content');
    });

    return editor;
};

/* Data Editor */

ExhibitConf.startEditData = function() {
    var EC = ExhibitConf

    , beginEdit = function(){
        var node = $(this)
        , original = node.contents()

        //parsing content attribute
        , content = node.attr('ex:content')
        , expr = Exhibit.ExpressionParser.parse(content)
        
        //identify item being edited
        , id = node.parents('[ex\\:itemId]').attr('ex:itemId')
        , database = EC.win.database

        //current value of attribute
        , results = expr.evaluateOnItem(id, database)
        , valueString = results.values.toArray().join(';')

        , segment , path

        , doneEdit = function() {
            var i
            , newString = node.text()
            , newResults = (newString.indexOf(";") >= 0) ?
                newString.split(';') : [newString]
            , newCount = newResults.length;

            node.get(0).contentEditable = false;
            node.off('keyup.exconf')
                .off('blur.exconf')
                .removeClass('exhibit-edit-content');
            if (newString === valueString) {
                node.empty().append(original); //don't bother with edit
            }
            else {
                if (segment.forward) {
                    database.removeObjects(id, segment.property);
                    for (i = 0; i < newCount; i++) {
                        database.addStatement(id, segment.property, 
                                              newResults[i]);
                    }
                }
                else {
                    database.removeSubjects(id, segment.property);
                    for (i = 0; i < newCount; i++) {
                        database.addStatement(newResults[i], 
                                              segment.property, id);
                    }
                }
            }
            $(EC.win.exhibit.getUIContext().getCollection().onFacetUpdated());
//                .trigger('onItemsChanged.exhibit');
//            ExhibitConf.rerender();
        };

        if ((id !== null) 
            && (typeof id !== 'undefined')
            && expr.isPath() 
            && ((path = expr.getPath()).getSegmentCount() === 1) 
            //don't know how to handle multisets, so don't edit
            && !Array.isArray(segment = path.getSegment(0))) {

            node.on('keyup.exconf', function(e){
                if (e.keyCode === 27) {//escape key
                    node.empty().append(original); //abort edit
                    node.blur();
                }
            });

            node.get(0).contentEditable=true;
            node.addClass('exhibit-edit-content')
                .one('blur.exconf', doneEdit)
                .focus();
        }
    };

    $('body',EC.win.document)
        .addClass('exhibit-editing-data')
        .on('click.exconf','[ex\\:content]',beginEdit);
};

ExhibitConf.stopEditData = function() {
    $('body',ExhibitConf.win.document)
        .removeClass('exhibit-editing-data')
        .off('click.exconf','[ex\\:content]');
};
