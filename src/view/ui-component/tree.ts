import * as $ from 'jquery';
import * as Bluebird from 'bluebird'

import { UiComponent } from '../view-controller';
import { FileContent, DownloadListItem, DownloadFileItem } from '../../services/web-scraping';



export class Tree implements UiComponent {

	ele         : JQuery<HTMLElement>;
	tree        : JSTree;
	data        : any[] = [];
	contentArray: FileContent[] = [];

	constructor(private selector: string) {}

	init() {
		this.ele = $(this.selector);
		this.ele.jstree({ 
			core: { 
				data: (obj, callback) => callback.call(this, this.data),
                check_callback: (operation, node, node_parent, node_position, more) => true
			},
			types: {
				File: 	{ icon: "jstree-default jstree-file" },
				Doc: 	{ icon: "jstree-default jstree-file" },
				Folder: { icon: "jstree-default jstree-folder" }
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
		this.tree = this.ele.jstree();
		console.log(this.tree);
	}

	openAll() {
		if(this.tree) this.tree.open_all();
	}

	selectAll() {
		if(this.tree) this.tree.select_all();		
	}
	deselectAll() {
		if(this.tree) this.tree.deselect_all();		
	}
	toggleSelection() {
		if(this.tree) {
			this.forEach(item => {
				if(item.type === "Folder") return;
				if(this.tree.is_selected(item)) {
					this.tree.uncheck_node(item, null);
				} else {
					this.tree.check_node(item, null);
				}
			});
		}
	}

	update(contentArray: FileContent[]) {
		this.contentArray = contentArray;
		this.data = this.convertToJsTreeData(contentArray);
		(<any>this.tree).refresh();
		(<any>this.tree).element.trigger("resize_column.jstree-table"); // Force jsTreeTable calculate the height of the cell (jsTreeTable.js:340)
		//console.log("jsTree Data:", Data.jsTreeData);
	}

	edit(id: number, callback: (node: any) => any) {
		if(this.tree) {
			var node = this.tree.get_node(id);
			var newNode = callback(node);
			if(!newNode) newNode = node;
			this.tree.redraw_node(newNode, null, null, null);
		}
	}

	editData(id: number, dataFiled: string, value: string) {
		if(this.tree) {		
			var node = this.tree.get_node(id);
			node.data[dataFiled] = value;
			this.tree.redraw_node(node, null, null, null);
		}
	}
	getRowDOM(id: number): JQuery<HTMLElement> {
		var cell0 = $("#"+id+"_anchor");
		var otherCell = $(".jstable_"+id+"_col");
		return cell0.add(otherCell);
	}

	getContentArray() {
		return this.contentArray;
	}

	// --------------------------------------------------------------------------------

	forEach(callback: (item: any) => void) {
		if(this.tree) {
			this.tree
				.get_json(null, <any> {flat: true})
				.forEach(callback);
		}
	}

	find(condition: (item: any) => boolean): any {
		if(this.tree) {
			var array = this.tree.get_json(null, <any> {flat: true});
			for(var i = 0; i < array.length; i++) {
				var item = array[i];
				if(condition(item) !== true) return item;
			}
			return null;
		} else {
			return null;
		}
	}

	getFolderPath(id: number, contentArray: FileContent[]): string {
		if(id === undefined) {
			return "";
		} else {
			var fileItem = contentArray[id];
			var parentFolderPath = this.getFolderPath(fileItem.parent, contentArray);
			return parentFolderPath + fileItem.name + "/";
		}
	}

	// --------------------------------------------------------------------------------

	getTestContentArray(): FileContent[] {
		return [
			{
				"id": 0,
				"type": "Folder",
				"name": "Content",
				"url": "https://learn.polyu.edu.hk/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2242014_1&mode=reset"
			},
			{
				"id": 1,
				"type": "Folder",
				"name": "Library Resources",
				"url": "https://learn.polyu.edu.hk/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2242037_1&mode=reset"
			},
			{
				"id": 2,
				"parent": 1,
				"type": "Doc",
				"name": "Library Tips & Tricks!",
				"attachmentName": ""
			},
			{
				"id": 3,
				"parent": 0,
				"type": "Folder",
				"name": "Course notes",
				"url": "/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2356432_1"
			},
			{
				"id": 4,
				"parent": 0,
				"type": "Folder",
				"name": "Quiz and Tutorial",
				"url": "/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2356448_1"
			},
			{
				"id": 5,
				"parent": 0,
				"type": "Folder",
				"name": "Laboratory Exercise",
				"url": "/webapps/blackboard/content/listContent.jsp?course_id=_53054_1&content_id=_2392360_1"
			},
			{
				"id": 6,
				"parent": 0,
				"type": "Doc",
				"name": "Assessment Plan",
				"attachmentName": " EIE4413 Assessment Plan.pdf",
				"url": "/bbcswebdav/pid-2356444-dt-content-rid-9763100_1/xid-9763100_1"
			},
			{
				"id": 7,
				"parent": 0,
				"type": "Doc",
				"name": "Course Schedule",
				"attachmentName": " Time Schedule.pdf",
				"url": "/bbcswebdav/pid-2356446-dt-content-rid-9763701_1/xid-9763701_1"
			},
			{
				"id": 8,
				"parent": 0,
				"type": "Doc",
				"name": "Assignment 1 Solution",
				"attachmentName": " Assignment1_sol.pdf",
				"url": "/bbcswebdav/pid-2399419-dt-content-rid-9879580_1/xid-9879580_1"
			},
			{
				"id": 9,
				"parent": 0,
				"type": "Doc",
				"name": "Test 1 Solution",
				"attachmentName": " Test1_sol.pdf",
				"url": "/bbcswebdav/pid-2408006-dt-content-rid-9947505_1/xid-9947505_1"
			},
			{
				"id": 10,
				"parent": 0,
				"type": "Doc",
				"name": "Assignment 2 Solution",
				"attachmentName": " Assignment2_sol.pdf",
				"url": "/bbcswebdav/pid-2420095-dt-content-rid-10076281_1/xid-10076281_1"
			},
			{
				"id": 11,
				"parent": 0,
				"type": "Doc",
				"name": "Test 2 Solution",
				"attachmentName": " Test2_sol.pdf",
				"url": "/bbcswebdav/pid-2421084-dt-content-rid-10101060_1/xid-10101060_1"
			},
			{
				"id": 12,
				"parent": 5,
				"type": "Doc",
				"name": "Introduction to Matlab",
				"attachmentName": " matlabTut.docx matlabTut_sol.docx",
				"url": "/bbcswebdav/pid-2392363-dt-content-rid-9835952_1/xid-9835952_1"
			},
			{
				"id": 13,
				"parent": 3,
				"type": "Doc",
				"name": "Introduction",
				"attachmentName": " Introduction.pptx",
				"url": "/bbcswebdav/pid-2356433-dt-content-rid-9763096_1/xid-9763096_1"
			},
			{
				"id": 14,
				"parent": 3,
				"type": "Doc",
				"name": "Fourier analysis",
				"attachmentName": " Fourier (for distribution).pptx",
				"url": "/bbcswebdav/pid-2356435-dt-content-rid-9763098_1/xid-9763098_1"
			},
			{
				"id": 15,
				"parent": 3,
				"type": "Doc",
				"name": "Convolution",
				"attachmentName": " Convolution (for distribution).pptx",
				"url": "/bbcswebdav/pid-2387896-dt-content-rid-9815376_1/xid-9815376_1"
			},
			{
				"id": 16,
				"parent": 3,
				"type": "Doc",
				"name": "Z-transform",
				"attachmentName": " Ztransform (for distribution).pptx",
				"url": "/bbcswebdav/pid-2392211-dt-content-rid-9835185_1/xid-9835185_1"
			},
			{
				"id": 17,
				"parent": 3,
				"type": "Doc",
				"name": "FIR Filter",
				"attachmentName": " FIR (for distribution).pptx",
				"url": "/bbcswebdav/pid-2396286-dt-content-rid-9862738_1/xid-9862738_1"
			},
			{
				"id": 18,
				"parent": 3,
				"type": "Doc",
				"name": "IIR Filter",
				"attachmentName": " IIR (for distribution).pptx",
				"url": "/bbcswebdav/pid-2408055-dt-content-rid-9947332_1/xid-9947332_1"
			},
			{
				"id": 19,
				"parent": 3,
				"type": "Doc",
				"name": "Statistical Signal Processing",
				"attachmentName": " Statistical DSP (for distribution).pptx",
				"url": "/bbcswebdav/pid-2413399-dt-content-rid-9993156_1/xid-9993156_1"
			},
			{
				"id": 20,
				"parent": 3,
				"type": "Doc",
				"name": "Adaptive Filter",
				"attachmentName": " Adaptive filter 3 (for distribution).pptx",
				"url": "/bbcswebdav/pid-2416941-dt-content-rid-10030996_1/xid-10030996_1"
			},
			{
				"id": 21,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 1 Solution",
				"attachmentName": " Quiz1_sol.pdf",
				"url": "/bbcswebdav/pid-2372832-dt-content-rid-9786988_1/xid-9786988_1"
			},
			{
				"id": 22,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 2 Solution",
				"attachmentName": " Quiz2_sol.pdf",
				"url": "/bbcswebdav/pid-2383706-dt-content-rid-9799636_1/xid-9799636_1"
			},
			{
				"id": 23,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 3 Solution",
				"attachmentName": " Quiz3_sol.pdf",
				"url": "/bbcswebdav/pid-2391825-dt-content-rid-9833400_1/xid-9833400_1"
			},
			{
				"id": 24,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 4 Solution",
				"attachmentName": " Quiz4_sol.pdf",
				"url": "/bbcswebdav/pid-2391826-dt-content-rid-9833801_1/xid-9833801_1"
			},
			{
				"id": 25,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 5 Solution",
				"attachmentName": " Quiz5_sol.pdf",
				"url": "/bbcswebdav/pid-2397895-dt-content-rid-9873055_1/xid-9873055_1"
			},
			{
				"id": 26,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 6 Solution",
				"attachmentName": " Quiz6_sol.pdf",
				"url": "/bbcswebdav/pid-2397896-dt-content-rid-9873056_1/xid-9873056_1"
			},
			{
				"id": 27,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 7 Solution",
				"attachmentName": " Quiz7_sol.pdf",
				"url": "/bbcswebdav/pid-2397898-dt-content-rid-9873057_1/xid-9873057_1"
			},
			{
				"id": 28,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 8 Solution",
				"attachmentName": " Quiz8_sol.pdf",
				"url": "/bbcswebdav/pid-2405483-dt-content-rid-9924842_1/xid-9924842_1"
			},
			{
				"id": 29,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 9 Solution",
				"attachmentName": " Quiz9_sol.pdf",
				"url": "/bbcswebdav/pid-2408198-dt-content-rid-9947863_1/xid-9947863_1"
			},
			{
				"id": 30,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 10 Solution",
				"attachmentName": " Quiz10_sol.pdf",
				"url": "/bbcswebdav/pid-2413375-dt-content-rid-9993151_1/xid-9993151_1"
			},
			{
				"id": 31,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 11 Solution",
				"attachmentName": " Quiz11_sol.pdf",
				"url": "/bbcswebdav/pid-2413377-dt-content-rid-9993152_1/xid-9993152_1"
			},
			{
				"id": 32,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 12 Solution",
				"attachmentName": " Quiz12_sol.pdf",
				"url": "/bbcswebdav/pid-2416939-dt-content-rid-10030994_1/xid-10030994_1"
			},
			{
				"id": 33,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 13 Solution",
				"attachmentName": " Quiz13_sol.pdf",
				"url": "/bbcswebdav/pid-2416940-dt-content-rid-10030995_1/xid-10030995_1"
			},
			{
				"id": 34,
				"parent": 4,
				"type": "Doc",
				"name": "Quiz 14 Solution",
				"attachmentName": " Quiz14_sol.pdf",
				"url": "/bbcswebdav/pid-2417955-dt-content-rid-10044075_1/xid-10044075_1"
			}
			];
	}

	// --------------------------------------------------------------------------------

	private convertToJsTreeData(contentArray: FileContent[]) {
		var data = [];
		for(var i = 0; i < contentArray.length; i++) {
			var item = contentArray[i];
			if(item) {
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
		}
		return data;
	}
}