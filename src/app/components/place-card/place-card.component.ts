import { Component, OnInit, Input } from '@angular/core';
import { Place } from 'src/app/services/place-service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-place-card',
  templateUrl: './place-card.component.html',
  styleUrls: ['./place-card.component.scss'],
})
export class PlaceCardComponent implements OnInit {

  @Input() place: Place;
  @Input() customObservable: Observable<any>;
  @Input() extraParams: any = {};
  @Input() color = 'white';
  @Input() showStatus: boolean;

  constructor() { }

  ngOnInit() {}

  getStatusColor(status: string) {
    if (status === 'Pending') {
      return 'warning';
    } else if (status === 'Approved') {
      return 'success';
    } else if (status === 'Rejected') {
      return 'danger';
    } else  {
      console.log('no match found');
    }
  }

}
