import * as $ from 'jquery';

import { Event } from '../../services/event';
import { UiComponent } from '../view-controller';


export interface TabsParam {}

export class Tabs implements UiComponent {
    
    ele$: JQuery<HTMLElement>;

    onClose = new Event();

    constructor(private selector: string, private param?: TabsParam) {    
        this.param = this.param || {
        };
    }

    init() {
        this.ele$ = $(this.selector);
        this.ele$.tabs();
    }
}