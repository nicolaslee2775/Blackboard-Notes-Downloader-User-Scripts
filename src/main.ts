//import './lib/jstreetable.js'
import * as $ from 'jquery'
declare var unsafeWindow;

import { MainController } from './main-controller'


$(document).ready(() => {
	let mainCtrl = new MainController();
	unsafeWindow.mainCtrl = mainCtrl;

	mainCtrl.init();
});