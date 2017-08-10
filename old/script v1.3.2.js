// ==UserScript==
// @name         Blackboard Notes Downloader
// @namespace    nico
// @version      1.1
// @description  Download notes
// @author       Nicolas
// @match        https://learn.polyu.edu.hk/webapps/blackboard/execute/modulepage/view?course_id=*
// @require      http://cdnjs.cloudflare.com/ajax/libs/bluebird/3.4.6/bluebird.min.js
// @require      http://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js
// @require      http://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.js
// @require      http://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.3/jstree.min.js
// @require      http://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js
// @resource	 jquery_ui_style https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/themes/base/jquery-ui.css
// @grant        GM_getResourceText
// @grant		 GM_addStyle
// @grant		 none
// ==/UserScript==





/*

$("#courseMenuPalette_contents>li>a[href^='/webapps/blackboard/content/listContent.jsp']").each(function(i, item){
  console.log(i, item.href, $(item).find("span").attr("title"));
})

*/


var Dictionary = (function() {
	var Dictionary = function() {};
	Dictionary.prototype.forEach = function(callback) {
		var props = Object.getOwnPropertyNames(this);
        for(var id = 0; id < props.length; id++) { 
			var prop = props[id];
			callback(this[prop], prop, props);
        }
	};
	Dictionary.prototype.getLen = function() {
		return Object.getOwnPropertyNames(this).length;
	};
	return Dictionary;
})();

//-----------------------------------------

var UI = {
	openDownloaderBtn: null,
	dialog: null,
    zipNameTextbox: null,
    selectAllBtn: null,
    deselectAllBtn: null,
    toggleSelection: null,
    startBtn: null,
    downloadBtn: null,
    treeDiv: null,
};
var Obj = {
    tree: null,
};
var Data = {
    jsTreeData: [],
	contentArray: [],
	fileDictionary: new Dictionary(),
};

//-----------------------------------------

var Http = {
    downloadPage: function(url) {
        return new Promise(function(resolve, reject) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    resolve(xhttp.responseText);
                }
            };
            xhttp.open("GET", url, true);
            xhttp.send();
        });
    },
    downloadFile: function(url) {
        return new Promise(function(resolve, reject) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    resolve({
                        response: xhttp.response,
                        responseURL: xhttp.responseURL
                    });
                }
            };
            xhttp.responseType = "blob";
            xhttp.open("GET", url, true);
            xhttp.send();
        });
    }
};
var HTML = {
	addStyle: function(params) {
		var byUrl = params.byUrl,
			byCss = params.byCss;
		
		var css;
		if(byUrl !== undefined) {
			css = document.createElement("link");
			css.rel = "stylesheet";
			css.type="text/css";
			css.href = byUrl;
		} else if(byCss !== undefined) {
			css = document.createElement("style");
			css.type = "text/css";
			css.innerHTML = byCss;
		}
		document.body.appendChild(css);
	},
};
var Utils = {
	conevrtToJsTreeData: function(contentArray) {
		var data = [];
		for(var i = 0; i < contentArray.length; i++) {
			var item = contentArray[i];
			var parent = (item.parent === undefined) ? "#" : item.parent;
			data.push({
				id: item.id,
				parent: parent,
				text: item.name,
				data: { attachmentName: item.attachmentName },
				type: item.type,

				state: { opened: true, selected: false }
			});
		}
		return data;
	},
	getFolderPath: function(id, contentArray) {
		function _getFolderPath(id, contentArray) {
			if(id === undefined) return "";
			var fileItem = contentArray[id];
			var parentFolderPath = _getFolderPath(fileItem.parent, contentArray);
			return parentFolderPath + fileItem.name + "/";	
		}
		return _getFolderPath(id, contentArray);
	},
	JsTree: {
		forEach: function(callback) {
			if(!Obj.tree) return;
			(Obj.tree)
				.get_json(null, {flat: true})
				.forEach(callback);
		},
		find: function(condition) {
			if(!Obj.tree) return;
			var array = (Obj.tree).get_json(null, {flat: true});
			for(var i = 0; i < array.length; i++) {
				var item = array[i];
				if(condition(item) !== true) return item;
			}
			return null;
		},
		edit: function(id, callback) {
			if(!Obj.tree) return;
			var node = Obj.tree.get_node(id);
			var newNode = callback(node);
			if(!newNode) newNode = node;
			Obj.tree.redraw_node(newNode);
		},
		editData: function(id, dataFiled, value) {
			if(!Obj.tree) return;
			var node = Obj.tree.get_node(id);
			node.data[dataFiled] = value;
			Obj.tree.redraw_node(node);
		},
		getRowDOM: function(id) {
			var cell0 = $("#"+id+"_anchor");
			var otherCell = $(".jstable_"+id+"_col");
			return cell0.add(otherCell);
		}
	},
    promiseChain: function(func) {
        // Const
        var Type = { THEN: 0, TAP: 1 };

        // Data Field
        var array = [{ func: func, type: Type.THEN }];

        var chain = function(input) {
            var result = Promise.resolve(input);
            array.forEach(function(item){
                if(item.type === Type.THEN) result = result.then(item.func);
                else result.then(item.func);
            });
            return result;
        };
        chain.then = pushFunc.bind(chain, Type.THEN);
        chain.tap = pushFunc.bind(chain, Type.TAP);

        // Private Function
        function pushFunc(type, func) {
            array.push({ func: func, type: type });
            return this;
        }

        return chain;
    }
};

//-----------------------------------------

var Code = {
	Html: {
	   	portlet: `
			<div class="portlet clearfix">
				<h2 class="clearfix">
					<span class="moduleTitle">Notes Downloader</span>
				</h2>
				<div class="collapsible" style="overflow: auto;">
					<button id="BND-open-downloader">Open</button>
				</div>
			</div>
		`,
		dialog: `
			<div id="BND-filetree-dialog" title="Notes Downloader">

				<div style="margin-bottom: 5px; display: flex; align-items: center; padding: 3px;">
					<span>Zip File Name:&nbsp;</span>
					<input type="text" id="BND-zip-name" style="flex: 1;">
				</div>

				<div style="margin-bottom: 5px">
					<button id="BND-select-all">
						<span class="ui-icon ui-icon-check"></span> Select All
					</button>
					<button id="BND-deselect-all">
						<span class="ui-icon ui-icon-closethick"></span> Deselect All
					</button>
					<button id="BND-toggle-selection">Toggle</button>

					<button id="BND-start" class="ui-state-active">Start</button>
					<button id="BND-download" class="ui-state-active">Dwonload</button>
				</div>

				<div id="BND-jstree-div"></div>
			</div>
		`,
	},
	Css: {
		removeJsTreeTableSelectedColor: `
			.jstree-default .jstree-wholerow-clicked,
			.jstree-table-midwrapper a.jstree-clicked:before,
			.jstree-table-midwrapper a.jstree-hovered:before,
			.jstree-default .jstree-wholerow-hovered {
				background: none;
			}
			.ui-button,.ui-widget {
				font-size: small;
			}
		`,
		statusColor: `
			.jstree-table-col-0[BND-status='idle'],
			.jstree-table-cell[BND-status='idle'] {
				background: none;
			}
			.jstree-table-col-0[BND-status='downloading'],
			.jstree-table-cell[BND-status='downloading'] {
				background: #f9efe2 !important;
			}
			.jstree-table-col-0[BND-status='done'],
			.jstree-table-cell[BND-status='done'] {
				background: #e4f7f1 !important;
			}
		`
	},
};

var Task = {
	getFileArray: function(html) {
        var id = (this !== window && this.startId) ? (this.startId) : 0,
            parentId = (this !== window && this.parentId) ? (this.parentId) : undefined,
            contentArray = [];

        var isDefined = function(obj) { return obj !== undefined; };

        return _getFileArray(html, parentId);

        //----------------------------------------------

        function _getFileArray(html, parentId) {
            //var testArray = [];

            return new Promise(function(resolve, reject) {
                 var deferredTask = []; // for each folder

                 var contentListItem = $(html).find("li[id^='contentListItem']");

                 contentListItem.each(function(){
                    var item = this;
                    var iconSrc = $(item).find(".item_icon")[0].src;

                    var isFile = iconSrc.endsWith("file_on.gif"),
                        isDocument = iconSrc.endsWith("document_on.gif"),
                        isFolder = iconSrc.endsWith("folder_on.gif");
                    //console.log(isFile, iconSrc);

                    //console.log(isFile, isDocument, isFolder);
                    if(isFile) {
                       var fileName = $(item).find("div.item a>span").text(),
                           fileUrl = $(item).find("div.item a").attr("href");
                       contentArray.push({
                          id: counter.get(),
                          parent: isDefined(parentId) ? parentId : undefined,
                          type: "File",
                          name: fileName,
                          url: fileUrl
                       });

                    } else if(isDocument) {
                       var docName = $(item).find("div.item span+span").text(),
                           docFileName = $(item).find("div.details .attachments a").text(),
                           docUrl = $(item).find("div.details .attachments a").attr("href");
                       contentArray.push({
                          id: counter.get(),
                          parent: isDefined(parentId) ? parentId : undefined,
                          type: "Doc",
                          name: docName,
                          attachmentName: docFileName,
                          url: docUrl
                       });

                    } else if(isFolder) {
                       var folderName = $(item).find("div.item a>span").text(),
                           folderUrl = $(item).find("div.item a").attr("href");

                       var temp = {
                          id: counter.get(),
                          parent: isDefined(parentId) ? parentId : undefined,
                          type: "Folder",
                          name: folderName,
                          url: folderUrl
                       };
                       contentArray.push(temp);

                       //console.log({folder: folderName, url: folderUrl});

                       deferredTask.push(
                          Http.downloadPage(folderUrl).then(function(html) {
                             return _getFileArray(html, temp.id);
                          })
                       );
                    }

                    //testArray.push(contentArray[contentArray.length-1]);
                 });

                 //console.log("parentId:", parentId, testArray);

                 Promise
                    .all(deferredTask)
                    .then(function() {
                    resolve(contentArray);
                 });

          });
        }
    },
	displayFileTree: function(contentArray) {
		(Data.jsTreeData) = Utils.conevrtToJsTreeData(contentArray);
        (Obj.tree).refresh();
        (Obj.tree.element).trigger("resize_column.jstree-table"); // Force jsTreeTable calculate the height of the cell (jsTreeTable.js:340)
		//console.log("jsTree Data:", Data.jsTreeData);
    },
	
	prepareDownloadList: function(contentArray) {
		return new Promise(function(resolve, reject) {
			var downloadList = [];

			Utils.JsTree.forEach(function(viewItem) {
				if(viewItem.type === "Folder") return;

				var selected = Obj.tree.is_selected(viewItem),
					undetermined = Obj.tree.is_undetermined(viewItem);

				if(selected || undetermined) {
					var fileItem = contentArray[viewItem.id];

					downloadList.push({
						id: viewItem.id,
						name: viewItem.text, 
						path: Utils.getFolderPath(fileItem.parent, contentArray), 
						url: fileItem.url
					});
				}

			});  

			resolve(downloadList);
		});
	},
	removeDuplicate: function(downloadList){
		return new Promise(function(resolve, reject) {
            var filtered = downloadList.filter(function(item){
				return !Data.fileDictionary[item.id];
			});
			//console.log("filtered:", filtered);
            resolve(filtered);
		});
	},
	downloadFile: function(item) {
		//if (typeof item.url !== "undefined") Promise.resolve();
		return Http.downloadFile(item.url).then(function(result) {
			var file = {
				id: item.id,
				name: item.name,
				path: item.path,
				data: result.response,
				url: result.responseURL
			};
			return file;
		});
	},
	downloadZip: function(downloadedFileList) {
		var zip = new JSZip();

		downloadedFileList.forEach(function(item) {
			var fileExtension = item.url.substring(item.url.lastIndexOf("."));
			zip.file(item.path + item.name + fileExtension, item.data);
		});

		return zip.generateAsync({type:"blob"})
			.then(function (blob) {
				var zipName = UI.zipNameTextbox.val();
				saveAs(blob, zipName + ".zip");
			});
	}
};

var Event = {
    openDownloader: function() {
        (UI.dialog).dialog("open");
        
        if(Data.contentArray.length === 0) {
            var defaultZipName = $("#courseMenuPalette_paletteTitleHeading a.comboLink").text();
            (UI.zipNameTextbox).val(defaultZipName);

            
            var contentUrlArray = $("#courseMenuPalette_contents>li>a[href^='/webapps/blackboard/content/listContent.jsp']").map(function(i, item){
                return {url: item.href, name: $(item).find("span").attr("title")};
            });
            
            console.log({contentUrlArray: contentUrlArray});
            

            
            
            Promise.resolve(contentUrlArray)
                .mapSeries((contentUrl, index) => Promise.resolve(contentUrl.url)
                    .then(Http.downloadPage)
                    .bind({counter: counter, parentId: index})
                    .then(Task.getFileArray)
                )
                .reduce((prev, next) => prev.concat(next))
                .tap(Task.displayFileTree)
                .then(function(contentArray) {
                    console.log({contentArray: contentArray});
                    Data.contentArray = contentArray;
                    (Obj.tree).open_all();
                });
            
            
        }
    },
    
    selectAll: function() {
        if(Obj.tree) Obj.tree.check_all();
    },
    deselectAll: function() {
        if(Obj.tree) Obj.tree.uncheck_all();
    },
    toggleSelection: function() {
        if(!Obj.tree) return;
        Utils.JsTree.forEach(function(item) {
            if(item.type === "Folder") return;
            if(Obj.tree.is_selected(item)) Obj.tree.uncheck_node(item);
            else Obj.tree.check_node(item);
        });
    },
    
    start: function() {
        if(!Obj.tree) return;
        if(!Data.contentArray) return;

        
        function updateDownloadStatus_downloading(downloadList){
            downloadList.forEach(function(item){
                (Utils.JsTree).editData(item.id, "status", "Downloading...");
                (Utils.JsTree).getRowDOM(item.id).attr("BND-status", "downloading");
            });
        }
        
        function updateDownloadStatus_done(file){
            console.log("Downloaded!", {id: file.id, name: file.name, url: file.url});

            var index = file.url.lastIndexOf("/") + 1;
            var fileName = decodeURIComponent(file.url.substring(index));
            (Utils.JsTree).editData(file.id, "fileName", fileName);

            (Utils.JsTree).editData(file.id, "status", "Done!");
            (Utils.JsTree).getRowDOM(file.id).attr("BND-status", "done");
        }
        
        function onDone(fileArray) {
            fileArray.forEach(function(file){
                Data.fileDictionary[file.id] = file;
            });

            (UI.downloadBtn)
                .attr("disabled", false)
                .removeClass("ui-state-disabled"); 
        }
        
        Promise.resolve(Data.contentArray)
            .then(Task.prepareDownloadList).then(Task.removeDuplicate).tap(updateDownloadStatus_downloading)
            .map(
                Utils.promiseChain(Task.downloadFile).tap(updateDownloadStatus_done)
            ).then(onDone);
        
    },
    download: function() {
        if(Data.fileDictionary.getLen() === 0) return;

        Task.downloadZip(Data.fileDictionary)
            .then(function(){
                console.log("done");
            });
    }
};

//-----------------------------------------

$(document).ready(function() {
   	'use strict';
   	// Load CSS
	HTML.addStyle({byUrl: "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/themes/base/jquery-ui.css"});
	HTML.addStyle({byUrl: "//cdnjs.cloudflare.com/ajax/libs/jstree/3.3.3/themes/default/style.min.css"});
	HTML.addStyle({byCss: Code.Css.removeJsTreeTableSelectedColor});
	HTML.addStyle({byCss: Code.Css.statusColor});
	
	// Append DOM element
   	$("#column0").prepend(Code.Html.portlet);
   	$(document.body).prepend(Code.Html.dialog);
	
	// Get UI
    UI.openDownloaderBtn = $("#BND-open-downloader");
    UI.dialog = $("#BND-filetree-dialog");
    UI.zipNameTextbox = $("#BND-zip-name");
    UI.selectAllBtn = $("#BND-select-all");
    UI.deselectAllBtn = $("#BND-deselect-all");
    UI.toggleSelection = $("#BND-toggle-selection");
    UI.startBtn = $("#BND-start");
    UI.downloadBtn = $("#BND-download");
    UI.treeDiv = $('#BND-jstree-div');
	
    // UI Setting
    UI_setting();
});

function UI_setting() {
    
    // jsTree
    
    (UI.treeDiv)
        .jstree({ 
            core: { 
                data: function(obj, callback) {
                    callback.call(this, Data.jsTreeData);
                } 
            },
            types: {
                File: { icon: "jstree-default jstree-file" },
                Doc: { icon: "jstree-default jstree-file" },
                Folder: { icon: "jstree-default jstree-folder"}
            },
            table: {
                resizable: true,
                width: "100%",
                columns: [
                    {width: 300, header: "Nodes"},
                    {width: 200, header: "Attachment Name", value: "attachmentName"},
                    {width: 200, header: "File Name", value: "fileName"},
                    {width: 100, header: "Status", value: "status"}
                ]
            },
            plugins: ["checkbox", "types", "wholerow", "table"]
        });
    Obj.tree = (UI.treeDiv).jstree();
    
    
    // Dialog
    
	UI.dialog
		.dialog({
			autoOpen: false,
			modal: true,
			height: 400,
			width: '70%',
			close: function() {
				//(Obj.tree).destroy();
				//Obj.tree = null;
			}
		});
	$(".ui-dialog").css("position", "absolute"); // Unknown issue: the position of ui-dialog would become 'relative'
	
    
    // Button
    
	UI.openDownloaderBtn
		.button()
		.on("click", Event.openDownloader);
    
    UI.selectAllBtn
        .button()
        .on("click", Event.selectAll);
    
    UI.deselectAllBtn
        .button()
        .on("click", Event.deselectAll);
    
    UI.toggleSelection
        .button()
        .on("click", Event.toggleSelection);

	UI.startBtn
        .button()
        .on("click", Event.start);
    
    UI.downloadBtn
        .button()
		.attr("disabled", true)
		.addClass("ui-state-disabled")
        .on("click", Event.download);
}

 







(function load_FileSaver() {
    /*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
	window.saveAs=function(e){if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,a=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},i=/constructor/i.test(e.HTMLElement)||e.safari,f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},s="application/octet-stream",d=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,d)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(a){u(a)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,d){if(!d){t=p(t)}var v=this,w=t.type,m=w===s,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&i)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;a(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define("FileSaver.js",function(){return saveAs})};
})();

(function load_jsTreeTable() {
	/* https://github.com/adamjimenez/jstree-table */
	!function(e){"function"==typeof define&&define.amd?define(["jquery","jstree"],e):e(jQuery)}(function(e){var t,r,a,i,s,n,l=/^\s*$/g,o=/[\\:&!^|()\[\]<>@*'+~#";,= \/${}%]/g,d=function(e){return(e||"").replace(o,"\\$&")},h="data-jstreetable",c="data-jstreetable-column",p="_DATA_",u=24,f=!1,b="jstable_",g="_col",v=10,m=function(e,t){return e.find("div["+h+'="'+t+'"]')},j=!1,w=null,_=0,x=0;s=/<\/?[^>]+>/gi,a=function(t,r){var a,i,s,n;return r._tableSettings=r._tableSettings||{},r._tableSettings.indent>0?n=r._tableSettings.indent:(a=e("<div></div>"),i=t.prev("i"),s=i.parent(),a.addClass(r.get_node("#",!0).attr("class")),s.appendTo(a),a.appendTo(e("body")),n=i.width()||u,s.detach(),a.remove(),r._tableSettings.indent=n),n},i=function(t,r,a,s,n){var l,o;if(s.data=e.extend(!0,{},r.data),r&&r.children_d&&n)for(l=0,o=r.children_d.length;o>l;l++)i(t,t.get_node(r.children_d[l]),a,a.get_node(s.children_d[l]),n)},n=function(e,t){var r,a=e.get_node(t),i=a.children;return r=i&&i.length>0&&a.state.opened?n(e,i[i.length-1]):t},t=function(e,t){var r,i,s=parseInt(t.settings.table.columns[0].width,10)+parseInt(t._tableSettings.treeWidthDiff,10);return r=t.get_node(e).parents.length,i=s-r*a(e,t),s},r=function(e,t,r){var a,i="a"===e.get(0).tagName.toLowerCase()?e:e.children("a"),n=r.settings.table.columns[0];a="",n.title&&(n.title===p?a=r.get_text(t):t.attr(n.title)&&(a=t.attr(n.title))),a=a.replace(s,""),a&&i.attr("title",a)},e.jstree.defaults.table={width:"auto"},e.jstree.plugins.table=function(t,a){var o=this;this._initialize=function(){if(!this._initialized){var t,r,a=this.settings.table||{},i=this.element,s=this._tableSettings={columns:a.columns||[],treeClass:"jstree-table-col-0",context:a.contextmenu||!1,columnWidth:a.columnWidth,defaultConf:{"*display":"inline","*+display":"inline"},isThemeroller:!!this._data.themeroller,treeWidthDiff:0,resizable:a.resizable,draggable:a.draggable,stateful:a.stateful,indent:0,sortOrder:"text",sortAsc:!0,fixedHeader:a.fixedHeader!==!1,headerContextMenu:a.headerContextMenu!==!1,checkIcon:"fa fa-check",arrowDownIcon:"fa fa-chevron-down",arrowUpIcon:"fa fa-chevron-up",width:a.width,height:a.height},n=s.columns,l=0;for(r=0;r<a.columns.length;r++)if(a.columns[r].tree){l=r;break}this.uniq=Math.ceil(1e3*Math.random()),this.rootid=i.attr("id");var o=/msie/.test(navigator.userAgent.toLowerCase());if(o){var d=parseFloat(navigator.appVersion.split("MSIE")[1]);8>d&&(s.defaultConf.display="inline",s.defaultConf.zoom="1")}for(f||(f=!0,t=[".jstree-table-cell {vertical-align: top; overflow:hidden;margin-left:0;width: 100%;padding-left:7px;white-space: nowrap; cursor: default; text-overflow: ellipsis;}",".jstree-table-cell span {margin-right:0px;margin-right:0px;*display:inline;*+display:inline;white-space: nowrap;}",".jstree-table-separator {position:absolute; top:0; right:0; height:24px; margin-left: -2px; border-width: 0 2px 0 0; *display:inline; *+display:inline; margin-right:0px;width:0px;}",".jstree-table-header-cell {overflow: hidden; white-space: nowrap;padding: 4px 3px 2px 5px; cursor: default;}",".jstree-table-header-themeroller {border: 0; padding: 1px 3px;}",".jstree-table-header-regular {position:relative; background-color: #CBF3FD; z-index: 1;}",".jstree-table-resizable-separator {cursor: col-resize; width: 10px;}",".jstree-table-separator-regular {border-color: #d0d0d0; border-style: solid;}",".jstree-table-cell-themeroller {border: none !important; background: transparent !important;}",".jstree-table-wrapper {table-layout: fixed; width: 100%; overflow: auto; position: relative;}",".jstree-table-midwrapper {display: table-row;}",".jstree-table-width-auto {width:auto;display:block;}",".jstree-table-column {display: table-cell; overflow: hidden;}",".jstree-table-col-0 {width: calc(100% - 18px); overflow: hidden; text-overflow: ellipsis;}",".jstree-table-sort-icon {font-size: 8px; position: absolute; top:0; left: calc(50% - 4px);}",".jstree-table-midwrapper a.jstree-clicked, .jstree-table-midwrapper a.jstree-hovered{background: transparent; border-color: transparent;}",'.jstree-table-midwrapper a.jstree-clicked:before, .jstree-table-midwrapper a.jstree-hovered:before {position: absolute; left: 0; content:""; height: inherit; z-index: -1;}',".jstree-table-midwrapper a.jstree-hovered:before {background: #e7f4f9;}",".jstree-table-midwrapper a.jstree-clicked:before {background: #beebff;}",".vakata-context {z-index:2;}"],e('<style type="text/css">'+t.join("\n")+"</style>").appendTo("head")),this.tableWrapper=e("<div></div>").addClass("jstree-table-wrapper").insertAfter(i),this.midWrapper=e("<div></div>").addClass("jstree-table-midwrapper").appendTo(this.tableWrapper),a.width&&this.tableWrapper.width(a.width),a.height&&this.tableWrapper.height(a.height),r=0;r<n.length;r++)e("<div></div>").addClass("jstree-default jstree-table-column jstree-table-column-"+r+" jstree-table-column-root-"+this.rootid).appendTo(this.midWrapper),"function"==typeof n[r].value&&console.warn("[jstree-table] using value as a function is no longer supported, use 'format' option instead.");this.midWrapper.children("div:eq("+l+")").append(i),i.addClass("jstree-table-cell"),s.fixedHeader&&this.tableWrapper.scroll(function(){e(this).find(".jstree-table-header").css("top",e(this).scrollTop())});var h=e.proxy(this.settings.sort,this);if(this.settings.sort=function(e,t){var r;if("text"===s.sortOrder)r=1===h(e,t);else{var a=this.get_node(e),i=this.get_node(t);r=a.data[s.sortOrder]>i.data[s.sortOrder]}return s.sortAsc===!1&&(r=!r),r?1:-1},s.draggable)if(e.ui&&e.ui.sortable){var c,p;e(this.midWrapper).sortable({axis:"x",handle:".jstree-table-header",cancel:".jstree-table-separator",start:function(e,t){c=t.item.index()},stop:function(e,t){p=t.item.index(),s.columns.splice(p,0,s.columns.splice(c,1)[0])}})}else console.warn("[jstree-table] draggable option requires jQuery UI");this._initialized=!0}},this.init=function(e,t){a.init.call(this,e,t),this._initialize()},this.bind=function(){a.bind.call(this),this._initialize(),this.element.on("move_node.jstree create_node.jstree clean_node.jstree change_node.jstree",e.proxy(function(e,t){var r=this.get_node(t||"#",!0);this._prepare_table(r)},this)).on("delete_node.jstree",e.proxy(function(e,t){if(void 0!==t.node.id){var r,a=this.tableWrapper,i=[t.node.id];for(t.node&&t.node.children_d&&(i=i.concat(t.node.children_d)),r=0;r<i.length;r++)m(a,i[r]).remove()}},this)).on("close_node.jstree",e.proxy(function(e,t){this._hide_table(t.node)},this)).on("open_node.jstree",e.proxy(function(){},this)).on("load_node.jstree",e.proxy(function(){},this)).on("loaded.jstree",e.proxy(function(){this._prepare_headers(),this.element.trigger("loaded_table.jstree")},this)).on("ready.jstree",e.proxy(function(){function t(){var t=a.element.find(".jstree-leaf").outerHeight(),r=e(".jstree-table-midwrapper").width();e("#jsTreeTableExtraCss").remove(),e('<style type="text/css" id="jsTreeTableExtraCss">						div.jstree-table-cell-root-'+a.rootid+" {line-height: "+t+"px; min-height: "+t+"px;}						div.jstree-table-midwrapper a.jstree-clicked:before, .jstree-table-midwrapper a.jstree-hovered:before {width: "+r+"px;}					</style>").appendTo("head")}var r=this.element.attr("class")||"";q=r.split(/\s+/).map(function(e){var t=e.match(/^jstree(-|$)/);return t?"":e}),this.tableWrapper.addClass(q.join(" "));var a=this;t(),e(window).on("resize",t),this.element.on("resize_column.jstree-table",t)},this)).on("move_node.jstree",e.proxy(function(t,r){var a=r.new_instance.element;a.find("li > a").each(e.proxy(function(){},this))},this)).on("search.jstree",e.proxy(function(e,t){var r=this.tableWrapper;return this._data.search.som&&t.nodes.length&&(r.find("div.jstree-table-cell-regular").hide(),t.nodes.add(t.nodes.parentsUntil(".jstree")).filter(".jstree-node").each(function(e,t){var a=t.id;a&&m(r,a).show()})),!0},this)).on("clear_search.jstree",e.proxy(function(){return this.tableWrapper.find("div.jstree-table-cell").show(),!0},this)).on("copy_node.jstree",function(e,t){var r=t.new_instance,a=t.old_instance,s=r.get_node(t.node,!0);return i(a,t.original,r,t.node,!0),r._prepare_table(s),!0}),this._tableSettings.isThemeroller&&this.element.on("select_node.jstree",e.proxy(function(e,t){t.rslt.obj.children("a").nextAll("div").addClass("ui-state-active")},this)).on("deselect_node.jstree deselect_all.jstree",e.proxy(function(e,t){t.rslt.obj.children("a").nextAll("div").removeClass("ui-state-active")},this)).on("hover_node.jstree",e.proxy(function(e,t){t.rslt.obj.children("a").nextAll("div").addClass("ui-state-hover")},this)).on("dehover_node.jstree",e.proxy(function(e,t){t.rslt.obj.children("a").nextAll("div").removeClass("ui-state-hover")},this)),this._tableSettings.stateful&&this.element.on("resize_column.jstree-table",e.proxy(function(e,t,r){localStorage["jstree-root-"+this.rootid+"-column-"+t]=r},this))},this.teardown=function(){var e=this.tableWrapper,t=this.element,r=e.parent();t.detach(),e.remove(),r.append(t),a.teardown.call(this)},this._clean_table=function(e,t){var r=this.tableWrapper;e?m(r,t).remove():r.find("div.jstree-table-cell-regular").remove()},this._prepare_headers=function(){var t,r,a,i,s,n,l,o,d,h,p=this,u=this._tableSettings,f=u.columns||[],b=u.columnWidth,g=u.resizable||!1,m=u.isThemeroller,C=m?"themeroller":"regular",y=!1,W=this.tableparent,z=this.rootid,S=u.defaultConf,k=0;for(this.parent=W,r=0;r<f.length;r++)s=f[r].headerClass||"",n=f[r].columnClass||"",l=f[r].header||"",o=f[r].value||"text",l&&(y=!0),i=u.stateful&&localStorage["jstree-root-"+z+"-column-"+r]?localStorage["jstree-root-"+z+"-column-"+r]:f[r].width||b,a=this.midWrapper.children("div.jstree-table-column-"+r),d=e("<div></div>").css(S).addClass("jstree-table-div-"+this.uniq+"-"+r+" "+(m?"ui-widget-header ":"")+" jstree-table-header jstree-table-header-cell jstree-table-header-"+C+" "+s+" "+n).html(l),d.addClass((m?"ui-widget-header ":"")+"jstree-table-header jstree-table-header-"+C),d.prependTo(a),o&&d.attr(c,o),d.hover(function(){e(this).addClass("jstree-hovered jstree-table-header-hovered")},function(){e(this).removeClass("jstree-hovered jstree-table-header-hovered")}),k+=d.outerWidth(),h=e("<div class='jstree-table-separator jstree-table-separator-"+C+(m?" ui-widget-header":"")+(g?" jstree-table-resizable-separator":"")+"'>&nbsp;</div>").appendTo(d),a.width(i),a.css("min-width",i),a.css("max-width",i);d.addClass((m?"ui-widget-header ":"")+"jstree-table-header jstree-table-header-last jstree-table-header-"+C),void 0===f[f.length-1].width&&(k-=i,a.css({width:"auto"}),d.addClass("jstree-table-width-auto").next(".jstree-table-separator").remove()),y?u.header=t:e("div.jstree-table-header").hide(),!this.bound&&g&&(this.bound=!0,e(document).mouseup(function(){var t,r,a,i,s,n;j&&(n=w.prevAll(".jstree-table-column").length,s=w.closest(".jstree-table-wrapper").find(".jstree"),t=e.jstree.reference(s),r=t.settings.table.columns,i=w.parent().children("div.jstree-table-column"),(isNaN(n)||0>n)&&(t._tableSettings.treeWidthDiff=s.find("ins:eq(0)").width()+s.find("a:eq(0)").width()-t._tableSettings.columns[0].width),a=t._tableSettings.columns[n].width=parseFloat(w.css("width")),j=!1,w=null,s.trigger("resize_column.jstree-table",[n,a]))}).mousemove(function(e){if(j){x=e.pageX;var t,r,a,i=x-_;0!==i&&(t=w.width(),r=parseFloat(w.css("width")),r||(r=w.innerWidth()),i=0>i?Math.max(i,-t):i,a=r+i,(i>0||t>0)&&a>v&&(w.width(a+"px"),w.css("min-width",a+"px"),w.css("max-width",a+"px"),_=x))}}),this.tableWrapper.on("selectstart",".jstree-table-resizable-separator",function(){return!1}).on("mousedown",".jstree-table-resizable-separator",function(t){return j=!0,_=t.pageX,w=e(this).closest("div.jstree-table-column"),!1}).on("dblclick",".jstree-table-resizable-separator",function(){var t=e(this).closest("div.jstree-table-column");p.autosize_column(t)}).on("click",".jstree-table-separator",function(e){e.stopPropagation()})),this.tableWrapper.on("click",".jstree-table-header-cell",function(){if(p.sort){var t=e(this).attr(c);if(t){var r;u.sortOrder===t&&u.sortAsc===!0?(u.sortAsc=!1,r=u.arrowDownIcon):(u.sortOrder=t,u.sortAsc=!0,r=u.arrowUpIcon),e(this).closest(".jstree-table-wrapper").find(".jstree-table-sort-icon").remove(),e("<span></span>").addClass("jstree-table-sort-icon").appendTo(e(this)).addClass(r);var a=p.get_node("#");p.sort(a,!0),p.redraw_node(a,!0)}}}),this.midWrapper.on("contextmenu",".jstree-table-header-cell",function(t){if(u.headerContextMenu){t.preventDefault();var r,a,i,s,n={fit:{label:"Size column to fit",action:function(){var r=e(t.target).closest("div.jstree-table-column");p.autosize_column(r)}},fitAll:{separator_after:!0,label:"Size all columns to fit",action:function(){p.autosize_all_columns()}}};p.midWrapper.find(".jstree-table-header-cell").each(function(){r=e(this),a=r.is(":visible")?u.checkIcon:!1,i=r.attr(c),s=r.clone().children(".jstree-table-sort-icon").remove().end().text().trim(),n[i]={icon:a,column:i,label:s,_disabled:"text"===i,action:function(e){var t=p.midWrapper.find(".jstree-table-header-cell["+c+"='"+e.item.column+"']").parent();t.toggle()}}}),e.vakata.context.show(this,{x:t.pageX,y:t.pageY},n)}})},this.redraw_node=function(e,t,r,i){return e=a.redraw_node.call(this,e,t,r,i),e&&this._prepare_table(e),e},this.refresh=function(){return this._clean_table(),a.refresh.apply(this,arguments)},this.set_id=function(e){var t;e&&(t=e.id);var r=a.set_id.apply(this,arguments);if(r&&void 0!==t){var i,s=this.tableWrapper,n=[t];for(e&&e.children_d&&(n=n.concat(e.children_d)),i=0;i<n.length;i++)m(s,n[i]).attr(h,e.id).attr("id",b+e.id+g+(i+1)).removeClass(b+t+g).addClass(b+e.id+g)}return r},this._hide_table=function(e){var t,r=e&&e.children_d?e.children_d:[];for(t=0;t<r.length;t++)m(this.tableWrapper,r[t]).remove()},this.holdingCells={},this.getHoldingCells=function(t,r,a){var i,s,n=e(),l=t.children||[];for(s=0;s<l.length;s++)i=b+d(l[s])+g+r,a[i]&&t.state.opened&&(n=n.add(a[i]).add(this.getHoldingCells(this.get_node(l[s]),r,a)));return n},this._edit=function(t,r,a){if(!t)return!1;if(!a)return!1;a=e(a),"div"===a.prop("tagName").toLowerCase()&&(a=a.children("span:first"));var i=this._data.core.rtl,s=this.element.width(),n=t.data[r.value],l=e("<div />",{css:{position:"absolute",top:"-200px",left:i?"0px":"-1000px",visibility:"hidden"}}).appendTo("body"),o=e("<input />",{value:n,"class":"jstree-rename-input",css:{padding:"0",border:"1px solid silver","box-sizing":"border-box",display:"inline-block",height:this._data.core.li_height+"px",lineHeight:this._data.core.li_height+"px",width:"150px"},blur:e.proxy(function(){var e=o.val();""===e||e===n?e=n:(t.data[r.value]=e,this.element.trigger("update_cell.jstree-table",{node:t,col:r.value,value:e,old:n}),this._prepare_table(this.get_node(t,!0))),o.remove(),a.show()},this),keydown:function(e){var t=e.which;27===t&&(this.value=n),(27===t||13===t||37===t||38===t||39===t||40===t||32===t)&&e.stopImmediatePropagation(),(27===t||13===t)&&(e.preventDefault(),this.blur())},click:function(e){e.stopImmediatePropagation()},mousedown:function(e){e.stopImmediatePropagation()},keyup:function(){o.width(Math.min(l.text("pW"+this.value).width(),s))},keypress:function(e){return 13===e.which?!1:void 0}}),d={fontFamily:a.css("fontFamily")||"",fontSize:a.css("fontSize")||"",fontWeight:a.css("fontWeight")||"",fontStyle:a.css("fontStyle")||"",fontStretch:a.css("fontStretch")||"",fontVariant:a.css("fontVariant")||"",letterSpacing:a.css("letterSpacing")||"",wordSpacing:a.css("wordSpacing")||""};a.hide(),a.parent().append(o),o.css(d).width(Math.min(l.text("pW"+o[0].value).width(),s))[0].select()},this.autosize_column=function(t){if(!t.is(":hidden")){var r,a,i=parseFloat(t.css("width")),s=0,n=t.prevAll(".jstree-table-column").length,l=t.width();t.find(".jstree-table-cell").each(function(){var t,r=e(this);r.css("position","absolute"),r.css("width","auto"),t=r.outerWidth(),r.css("position","relative"),t>s&&(s=t)}),r=s-i,r=0>r?Math.max(r,-l):r,a=i+r+"px",t.width(a),t.css("min-width",a),t.css("max-width",a),e(this).closest(".jstree-table-wrapper").find(".jstree").trigger("resize_column.jstree-table",[n,a])}},this.autosize_all_columns=function(){this.tableWrapper.find(".jstree-table-column").each(function(){o.autosize_column(e(this))})},this._prepare_table=function(t){var a,i,o,c,p,u,f,v,j,w,_,x,C,y,W,z,S,k,T,A,I,q,D,M,P,F,H,V,L,N=this._tableSettings,O=N.treeClass,U=this,B=N.columns||[],E=N.isThemeroller,X=this.element,$=this.rootid,Q=E?"themeroller":"regular",Y=this.get_node(t),G=N.columnWidth,J=N.defaultConf,K=function(t,r,a,i){return function(s){r.children(".jstree-anchor").trigger("click.jstree",s),t.trigger("select_cell.jstree-table",[{value:a,column:i.header,node:r,table:e(this),sourceName:i.value}])}},R=function(t,r,a,i,s){return function(t){N.context&&(t.preventDefault(),e.vakata.context.show(this,{x:t.pageX,y:t.pageY},{edit:{label:"Edit",action:function(){var e=s.get_node(r);U._edit(e,i,t.target)}}}))}},Z=function(e,t){return function(){t.hover_node(e)}},et=function(e,t){return function(){t.dehover_node(e)}},tt=this.midWrapper,rt=Y.id,at=this.get_node(Y.parent).children,it=e.inArray(rt,at),st=this.holdingCells,nt=!1;if(a=e(t),j=a.children("a"),1===j.length){L=!Y.state.opened,z=b+d(rt)+g,S="#"===Y.parent?null:Y.parent,j.addClass(O),r(j,a,U),w=j;var lt=this.settings.table,ot=0;for(c=0;c<lt.columns.length;c++)if(lt.columns[c].tree){ot=c;break}for(c=0;c<B.length;c++)ot!==c&&(P=B[c],V=tt.children("div:eq("+c+")"),u=P.cellClass||"",f=P.wideCellClass||"",v=P.columnClass||"",V.addClass(v),p="",Y.data&&void 0!==Y.data[P.value]&&(p=Y.data[P.value]),"function"==typeof P.format&&(p=P.format(p)),P.images?(o=P.images[p]||P.images["default"],o&&(F="*"===o[0]?'<span class="'+o.substr(1)+'"></span>':'<img src="'+o+'">')):F=p,(void 0===F||null===F||l.test(F))&&(F="&nbsp;"),_=P.valueClass&&null!==Y.data&&void 0!==Y.data?Y.data[P.valueClass]||"":"",_&&P.valueClassPrefix&&""!==P.valueClassPrefix&&(_=P.valueClassPrefix+_),x=P.wideValueClass&&null!==Y.data&&void 0!==Y.data?Y.data[P.wideValueClass]||"":"",x&&P.wideValueClassPrefix&&""!==P.wideValueClassPrefix&&(x=P.wideValueClassPrefix+x),W=P.title&&null!==Y.data&&void 0!==Y.data?Y.data[P.title]||"":"","string"==typeof W&&(W=W.replace(s,"")),y=7,i=P.width||G,"auto"!==i&&(i=H||i-y),w=m(V,rt),(!w||w.length<1)&&(w=e("<div></div>"),e("<span></span>").appendTo(w),w.attr("id",z+c),w.addClass(z),w.attr(h,rt)),A=it>0?n(this,at[it-1]):Y.parent,T=m(V,A),q=it<at.length-1?at[it+1]:"NULL",I=m(V,q),M=Y.children&&Y.children.length>0?Y.children[0]:"NULL",D=m(V,M),k=m(V,S),S?(k&&k.length>0?(T&&T.length>0?w.insertAfter(T):D&&D.length>0?w.insertBefore(D):I&&I.length>0?w.insertBefore(I):w.insertAfter(k),nt=!0):nt=!1,st[z+c]=w):(T&&T.length>0?w.insertAfter(T):D&&D.length>0?w.insertBefore(D):I&&I.length>0?w.insertBefore(I):w.appendTo(V),nt=!0),nt&&w.after(this.getHoldingCells(Y,c,st)),C=w.children("span"),C.addClass(u+" "+_).html(F),w=w.css(J).addClass("jstree-table-cell jstree-table-cell-regular jstree-table-cell-root-"+$+" jstree-table-cell-"+Q+" "+f+" "+x+(E?" ui-state-default":"")).addClass("jstree-table-col-"+c),w.click(K(X,a,p,P,this)),w.on("contextmenu",R(X,a,p,P,this)),w.hover(Z(a,this),et(a,this)),W&&C.attr("title",W));w.addClass("jstree-table-cell-last"+(E?" ui-state-default":"")),void 0===B[B.length-1].width&&w.addClass("jstree-table-width-auto").next(".jstree-table-separator").remove()}this.element.css({"overflow-y":"auto !important"})},this.holdingCells={}}});
})();
