//import './lib/jstreetable.js'
import * as $ from 'jquery'
declare var unsafeWindow;
declare var TEST_MODE;

import { MainController } from './main-controller'


$(document).ready(() => {
	let mainCtrl = new MainController();
	unsafeWindow.mainCtrl = mainCtrl;

	mainCtrl.init();
});