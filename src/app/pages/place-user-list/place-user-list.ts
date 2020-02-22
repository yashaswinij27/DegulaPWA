
import { Component, Injector, ViewChild, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { Subject, Observable, merge } from 'rxjs';
import { BasePage } from '../base-page/base-page';
import { Place } from '../../services/place-service';
import { Category } from 'src/app/services/categories';
import { User } from 'src/app/services/user-service';
import { EventBusService } from 'src/app/services/event-bus.service';
import {
  trigger,
  style,
  animate,
  transition,
  query,
  stagger
} from '@angular/animations';

@Component({
  selector: 'place-user-list-page',
  templateUrl: 'place-user-list.html',
  styleUrls: ['place-user-list.scss'],
  animations: [
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', style({ opacity: 0, transform: `translate3d(0,10px,0)` }), { optional: true }),
        query(':enter', stagger('100ms', [animate('300ms', style({ opacity: 1, transform: `translate3d(0,0,0)` }))]), { optional: true })
      ])
    ])
  ]
})
export class PlaceUserListPage extends BasePage implements OnInit {

  @ViewChild(IonContent, { static: true }) container: IonContent;

  public params: any = {};
  public category: Category;
  public skeletonArray: any;
  public places: Place[] = [];

  public contentLoaded: Subject<any>;
  public loadAndScroll: Observable<any>;

  constructor(injector: Injector,
    private eventBusService: EventBusService,
    private placeService: Place) {
    super(injector);
  }

  ngOnInit() {

    console.log('onInit')

    this.setupObservables();

    this.setupEvents();

    this.params.unit = this.preference.unit;
    this.params.limit = 20;
    this.params.page = 0;
    this.params.status = ['Pending', 'Approved', 'Expired', 'Rejected'];
    this.params.user = User.getCurrent();
  }

  ngOnDestroy() {
    //this.events.unsubscribe('place:add');
  }

  setupObservables() {

    this.contentLoaded = new Subject();

    this.loadAndScroll = merge(
      this.container.ionScroll,
      this.contentLoaded,
    );
  }

  onContentLoaded() {
    setTimeout(() => {
      this.contentLoaded.next();
    }, 300);
  }

  setupEvents() {
    this.eventBusService.on('place:add', () => {
      this.onReload();
    });
  }

  async ionViewDidEnter() {

    if (!this.places.length) {
      await this.showLoadingView({ showOverlay: false });
      this.loadData();
    } else {
      this.onContentLoaded();
    }

    const title = await this.getTrans('PLACES');
    this.setPageTitle(title);

    this.setMetaTags({
      title: title
    });
  }

  enableMenuSwipe() {
    return false;
  }

  async loadData() {

    try {

      const places = await this.placeService.load(this.params);

      for (let place of places) {
        this.places.push(place);
      }

      this.onRefreshComplete(places);

      if (this.places.length) {
        this.showContentView();
      } else {
        this.showEmptyView();
      }

      this.onContentLoaded();

    } catch (err) {

      this.showContentView();
      this.onRefreshComplete();

      let message = await this.getTrans('ERROR_NETWORK');
      this.showToast(message);
    }
  }

  onPlaceTouched(place: Place) {
    if (place.status === 'Approved') {
      this.navigateToRelative('./' + place.id);
    }
  }

  onLoadMore(event: any = {}) {
    this.infiniteScroll = event.target;
    this.params.page++;
    this.loadData();
  }

  onReload(event: any = {}) {
    this.refresher = event.target;
    this.places = [];
    this.params.page = 0;
    this.loadData();
  }

  getStatusColor(status: string) {
    if (status === 'Pending') {
      return 'warning';
    } else if (status === 'Approved') {
      return 'success';
    } else if (status === 'Rejected') {
      return 'danger';
    } else if (status === 'Expired') {
      return 'tertiary';
    } else  {
      console.log('no match found');
    }
  }

}
