//Configuration of editor
ExhibitConf = {};

ExhibitConf.exprSelector = function (win) {
    var props = (win || window).database.getAllProperties(),
    selector = $('<select></select>'),
    input = $('<input type="textfield">').hide(),
    box = $('<input type="checkbox">'),
    advanced = $('<div>Advanced expression: </div>').append(box),
    container = $('<div></div>'),
    jqVal = container.val;

    box.change(function() {
	selector.toggle();
	input.toggle();
    });
    $.each(props, function(i, p) {
	$('<option></option>').text(p).attr('value',p)
	    .appendTo(selector);
    });
    
    return {dom: $('<div></div>').append(selector).append(input).append(advanced),
	    val: function(set) {
		if (typeof(set) === 'undefined') {
		    return box.is(':checked') ?
			input.val() :
			"." + selector.val();
		} else {
		    return selector.val(set);
		}
	    }
	   };
};


(function() {
    var EC = ExhibitConf,
    nameAttribute, configureSettingSpecs, makeSettingsTable, settingsDialog,
    markExhibit, reinit, findFacet, handleEditClick, 
    initialized = false;
    settingSpecs = {};

    nameAttribute = function(elmt, name) {
	elmt = $(elmt);

	if (elmt.attr(name) !== undefined) {
            return name;
	} else if (elmt.attr("data-ex-" + name)) {
            return "data-ex-" + name;
	} else {
            return "ex:" + name;
	} 
    };


    //configuring the configurator


    settingSpecs.views = {
	"TileView": {label: "List", superclassName: "OrderedViewFrame"},
	"ThumbnailView": {superclassName: "OrderedViewFrame"},
	"TimelineView": {
	    specs: {
		"start": {type: "text"},
		"end": {type: "text"},
		"colorKey": {type: "text"},
		"iconKey": {type: "text"},
		"eventLabel": {type: "text"},
		"caption": {type: "text"}
	    }
	}
    };

    settingSpecs.facets = {
	"ListFacet": {label: "List",
                      specs: {"expression": {type: "text", defaultValue: ""}}},
	"CloudFacet": {label: "Tag Cloud",
		       specs: {"expression": {type: "text", defaultValue: ""}}},
	"NumericRangeFacet": {label: "Numeric Range",
			      specs: {"expression": {type: "text", 
						     defaultValue: ""}}},
	"HierarchicalFacet": {label: "Hierarchical List",
			      specs: {"expression": {type: "text", 
						     defaultValue: ""}}},
	"TextSearchFacet": {label: "Text Search", 
			    specs: {"expressions": {type: "text", 
						    defaultValue: ""}}},
	"AlphaRangeFacet": {label: "Alphabetical Range",
			    specs: {"expression": {type: "text", 
						   defaultValue: ""}}}

    };

    settingSpecs.viewPanel = {
	"viewPanel": {label: "View Panel",
                      specs: {initialView: {type: "int",
                                            defaultValue: 0}}
                     }
    };


    configureSettingSpecs = function() {

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
                jQuery.extend(true, comp.specs, 
                              Exhibit.OrderedViewFrame._settingSpecs);
            }
        };

        for (className in settingSpecs.views) {
            if (settingSpecs.views.hasOwnProperty(className)) {
                configureOne(settingSpecs.views[className],
                             className,
                             Exhibit.UI.viewClassNameToViewClass);
            }
        }              

        for (className in settingSpecs.facets) {
            if (settingSpecs.facets.hasOwnProperty(className)) {
                configureOne(settingSpecs.facets[className],
                             className,
                             Exhibit.UI.facetClassNameToFacetClass);
            }
        }
    };

    makeSettingsTable = function(specs, settings) {

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
		inputHolder.append(exprSelector().dom);
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
    };

    //create a dialog that destructively modifies exhibit component settings
    settingsDialog = function(comp, title, settings) {
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
        dialog.dialog({"buttons": {
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
        var specs, comp, className, title, field, eField, promise,
        settings = {},
        role = Exhibit.getRoleAttribute(elt);

        switch(role) {
        case "view": 
            comp = "views";
            title = "Configure View";
            className = Exhibit.getAttribute(elt,"viewClass") || "TileView";
            break;
        case "facet":
            comp = "facets";
            title = "Configure Facet";
            className = Exhibit.getAttribute(elt,"facetClass") || "ListFacet";
            break;
        case "viewPanel":
            comp = "viewPanel";
            title = "Configure View Panel";
            className = "viewPanel";
            break;
        }
	
	if (!initialized) {
            configureSettingSpecs();
	    initialized=true;
	}

        specs = settingSpecs[comp][className].specs;
        Exhibit.SettingsUtilities.collectSettingsFromDOM(elt, specs, settings);

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
                    if (settings[field] === specs[field].defaultValue) {
                        elt.removeAttr(eField);
                    } else {
                        elt.attr(eField, settings[field]);
                    }
                }
            }
        });
	return promise;
    };


    EC.configureData = function() {
	var link = $('[rel="exhibit/data"]'),
	linkVal = link.attr('href'),
	linkType = link.attr('type'),
	linkField = $('<input type="textfield" width="50"></input>'),
	typeField = $('<select></select>')
	    .append('<option value="application/json">JSON</option>')
	    .append('<option value="application/jsonp">JSONP</option>'),
	instructions = $('<div><div>').text('Enter data URL'),
	dialog = $('<div></div>').append(instructions)
	    .append(linkField)
	    .append(typeField)
	    .val(linkType),
	saveLinks = function() {
	    dialog.dialog('close');
	    if (link === null) {
		link = $('<link rel="exhibit/data">').appendTo('head');
	    }
	    if (linkVal !== linkField.val()
		|| linkType !== typeField.val()) {
		link.attr('href',linkField.val());
		if (typeField.val()) {
		    link.attr('type',typeField.val());
		};
		Exhibit.Lens._commonProperties = null; //clear cache
		reinit();
	    }
	    
	};

	if (link.length > 0) {
	    linkField.val(linkVal);
	    typeField.val(linkType);
	};

	dialog.dialog({
            title: 'Edit Data Link',
            width: 400,
	    height: 300,
            modal: true, 
            buttons: {
		"OK": saveLinks,
		"Cancel": function() { 
                    $(this).dialog('close');
		},
            }
	});
	

    }

    EC.unrender = function(dom) {
        dom = $(dom || document);
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
    };

    markExhibit = function(dom) {
	$(dom || document);
        $('[ex\\:role="view"]',dom).addClass('exhibit-editable');
        $('[ex\\:role="facet"]',dom).addClass('exhibit-editable');
    };

    EC.rerender = function(win) {
	win = win || window;
	EC.unrender(win.document);
	win.Exhibit.History.eraseState();
	win.exhibit.configureFromDOM();
    };

    reinit = function(win) {
	win = win || window;
	EC.unrender(win.document);
	Exhibit.History.eraseState();
	win.database.removeAllStatements();
        win.database.loadLinks(function() {
	    //need to set proper 'this" on configure call
	    //so can't just pass configureFromDOM
	    win.exhibit.configureFromDOM();
	});
    }

    findFacet = function (elt,win) {
	var i, 
	collection = (win||window).exhibit.getUIContext().getCollection(),
	facets = collection._facets;

	elt = elt.get(0);
	for (i=0; i<facets.length; i++) {
	    if (facets[i]._dom.elmt.get(0) === elt) {
		return facets[i];
	    }
	}
	alert("can't find facet!");
    };

    handleEditClick = function(event) {
        var button = $(event.target), f,
        elt = button.parent();

        button.detach();
        EC.configureElement(elt).done(function () {
	    if (Exhibit.getRoleAttribute(elt) === 'facet') {
		f = findFacet(elt);
		f.dispose();
	    }
	    EC.rerender()});
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
	uri = "data:application/octet-stream;charset=utf-8,"
	    + encodeURIComponent('<html>'+html+'</html>');
	window.open(uri,"_blank");
    };

    (function () {

        var editButton = $('<button class="exhibit-edit-tab">Edit</button>'),

        showEditButton = function () {
	    //quick hack: set parent css so edit button absolute positioning
	    //is relative to parent
	    editButton.detach();
	    $(this).css('position','relative').prepend(editButton);
	    return false; //stop propagation
        };


        EC.startEdit = function() {
	    markExhibit();
	    $('body').addClass('exhibit-editing');
	    editButton.click(handleEditClick); //shouldn't have to
	    //re-add this every
	    //time but handler is
	    //somehow getting
	    //dropped when I
	    //detach the button
	    $('body').on('mouseover','.exhibit-editable',showEditButton);
        };

        EC.stopEdit = function () {
	    $('body').off('mouseover','.exhibit-editable',showEditButton);
	    $('body').removeClass('exhibit-editing');
	    editButton.off('click',handleEditClick); //remove since re-add
	    EC.unrender(document);
	    window.exhibit.configureFromDOM();
        };
    })();
})();


ExhibitConf.createLensEditor = function(lens, editContainer) {
    var editor = {},
    
    alohaEditor = Aloha.jQuery(editContainer.get(0)).empty(),
    cleanAlohaEditor = function() {
	//          for future, use Aloha api
	//	    var edited = editor.children().eq(0),
	//	    editId = edited.attr('id'),
	//	    content = Aloha.getEditableById(editId).getContents(true);

	//	    var copy = editor.clone();
	//	    copy.removeAttr('contenteditable');
	//		.removeClass('aloha-editable aloha-editable-active')
	return alohaEditor.html();
    },

    updateLens = function() {
	lens.empty().append(cleanAlohaEditor());
	ExhibitConf.rerender();
    },

    deferredUpdateLens = function() {
	clearTimeout(timer);
	timer = setTimeout(updateLens,200);
    },

    timer = null,
    tracker = null,
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
	return (function() {
	    clearInterval(timer);
	});
    },
    tracker = createChangeTracker(cleanAlohaEditor, deferredUpdateLens),

    editContent = function(content, attr) {
	var 
	deferred = $.Deferred(),
	dialog = $('<div><div>Property to use:</div></div>'),
	attr = attr || 'ex:content',
	selector = ExhibitConf.exprSelector();

	if (content.attr(attr)) {
	    selector.val(content.attr(attr).substr(1));
	}
	dialog.append(selector.dom);
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
		       "width": "550"
		      });
	return deferred.promise();
    };

    editor.addNode = function(tagName, attr) {
	var node = $(document.createElement(tagName)),
	//remember/restore range since interaction w/dialog clear it
	range = Aloha.getSelection().getRangeAt(0), 
	insertLensContent = function() {
	    //hack because can only insert strings
	    Aloha.getSelection().removeAllRanges();
	    Aloha.getSelection().addRange(range);
	    Aloha.execCommand('insertHTML', false, 
			      '<'+tagName+' '
			      + attr + '="'
			      + node.attr(attr)
			      + '">'
			      + '</'+tagName+'>');
	};
	editContent(node,attr).done(insertLensContent);
    };

    editor.addImg = function(editable) {
	editor.addNode('img','ex:src-content');
    };

    editor.addText = function(editable) {
	editor.addNode('span','ex:content');
    };

    editor.stopEdit = function() {
	var editor = Aloha.jQuery(editContainer);
	alohaEditor.mahalo().empty();
	tracker(); //destroys tracker
    };

    $(lens)
	.contents().clone()
	.appendTo(alohaEditor.empty()),
    alohaEditor.aloha();
    alohaEditor.on('click','[ex\\:content]',function() {
	editContent($(this));
    });
    alohaEditor.on('click','img[ex\\:src-content]',function() {
	editContent($(this),'ex:src-content');
    });

    return editor;
}
