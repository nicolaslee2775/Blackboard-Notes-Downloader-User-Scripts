/*
import * as $ from 'jquery'
import 'jquery-ui'
import 'jstree'
import * as jszip from 'jszip'
import * as Bluebird from 'bluebird'
import * as fileSaver from 'file-saver'
*/

import './lib/jstreetable.js'


import * as $ from 'jquery'


import { MainController } from './main-controller'


declare var unsafeWindow;

$(document).ready(() => {
	let mainCtrl = new MainController();
	unsafeWindow.mainCtrl = mainCtrl;

	mainCtrl.init();
});