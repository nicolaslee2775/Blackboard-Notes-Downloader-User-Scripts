import * as $ from 'jquery';

import { Event } from '../../services/event';
import { UiComponent } from '../view-controller';


export interface ButtonParam {
    disabled?: boolean
}

export class Button implements UiComponent {
    
    ele$: JQuery<HTMLButtonElement>;

    onClick = new Event();

    constructor(private selector: string, private param?: ButtonParam) {    
        this.param = this.param || {
            disabled: false
        };
    }

    init() {
        this.ele$ = <any> $(this.selector).button();
        this.ele$.on("click", () => this.onClick.notify());
        
        if(this.param.disabled) this.disable();        
    }

    enable() {
        this.ele$.attr("disabled", <any> false).removeClass("ui-state-disabled")
    }
    disable() {
        this.ele$.attr("disabled", <any> true).addClass("ui-state-disabled");        
    }
}