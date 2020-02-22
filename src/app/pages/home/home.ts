import { Component, Injector, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { BasePage } from '../base-page/base-page';
import * as Parse from 'parse';
import { Category } from '../../services/categories';
import { Place } from '../../services/place-service';
import { Subject, Observable, merge } from 'rxjs';
import { GeolocationService } from 'src/app/services/geolocation.service';
import { Installation } from 'src/app/services/installation';
import { WindowRef } from 'src/app/services/window-ref';
import { EventBusService, EmitEvent } from 'src/app/services/event-bus.service';
import { Slide } from 'src/app/services/slider-image';
import { LocationSelectPage } from '../location-select/location-select';
import { LocalStorage } from 'src/app/services/local-storage';
import { LocationAddress } from 'src/app/models/location-address';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'home-page',
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomePage extends BasePage {

  @ViewChild(IonContent, { static: true }) container: IonContent;

  public slides: Slide[] = [];
  public featuredPlaces: Place[] = [];
  public newPlaces: Place[] = [];
  public randomPlaces: Place[] = [];
  public nearbyPlaces: Place[] = [];

  public categories: Category[] = [];

  public params: any = {};

  public slideOpts = {};

  public skeletonArray: any;

  public location: any;

  public slidesTopEvent: Subject<any>;
  public slidesTopObservable: Observable<any>;

  public horizontalScroll: Subject<any>;
  public onHorizontalScroll: Observable<any>;

  public contentLoaded: Subject<any>;
  public loadAndScroll: Observable<any>;

  constructor(injector: Injector,
    private localStorage: LocalStorage,
    private geolocationService: GeolocationService,
    private installationService: Installation,
    private windowRef: WindowRef,
    private eventBusService: EventBusService,
    private placeService: Place) {
    super(injector);

    this.skeletonArray = Array(6);
  }

  enableMenuSwipe(): boolean {
    return false;
  }

  async ionViewDidEnter() {
    const title = await this.getTrans('APP_NAME');
    this.setPageTitle(title);

    this.setMetaTags({
      title: title
    });
  }

  async ngOnInit() {
    this.setupObservables();
    this.setupSliders();

    await this.showLoadingView({ showOverlay: false });
    await this.setupDistanceUnit();
    this.loadData();
    this.loadNearbyPlaces();
  }

  async setupDistanceUnit() {

    try {

      const unit = await this.localStorage.getUnit();

      if (unit === null) {
        this.params.unit = environment.defaultUnit;
      } else {
        this.params.unit = unit;
      }

    } catch (error) {
      this.params.unit = environment.defaultUnit;
    }

    this.preference.unit = this.params.unit;
  }

  onReload(event: any = {}) {
    this.refresher = event.target;
    this.showLoadingView({ showOverlay: false });
    this.loadData();
    this.loadNearbyPlaces();
  }

  onScroll() {
    this.horizontalScroll.next();
  }

  onSlidesTopDidLoad() {
    this.slidesTopEvent.next();
  }

  onSlidesTopWillChange() {
    this.slidesTopEvent.next();
  }

  onContentLoaded() {
    this.contentLoaded.next();
  }

  setupObservables() {

    this.slidesTopEvent = new Subject();
    this.horizontalScroll = new Subject();
    this.contentLoaded = new Subject();

    this.loadAndScroll = merge(
      this.container.ionScroll,
      this.horizontalScroll,
      this.contentLoaded,
      this.slidesTopEvent,
    );
  }

  setupSliders() {
    this.slideOpts = {
      autoplay: {
        delay: 7000
      },
      spaceBetween: 16,
      zoom: false,
      touchStartPreventDefault: false
    };
  }

  async loadData() {

    try {

      const data: any = await Parse.Cloud.run('getHomePageData', this.params);

      this.randomPlaces = data.randomPlaces;
      this.newPlaces = data.newPlaces;
      this.featuredPlaces = data.featuredPlaces;
      this.categories = data.categories;
      this.slides = data.slides;

      this.onRefreshComplete();
      this.showContentView();
      this.onContentLoaded();

    } catch (error) {

      this.showErrorView();
      this.onRefreshComplete();

      this.translate.get('ERROR_NETWORK')
        .subscribe(str => this.showToast(str));

      if (error.code === 209) {
        this.eventBusService.emit(new EmitEvent('user:logout'));
      }

    }

  }

  loadMoreRandomPlaces() {

    Parse.Cloud.run('getRandomPlaces', this.params)
      .then((places: Place[]) => {

        for (const place of places) {
          this.randomPlaces.push(place);
        }

        this.onRefreshComplete();

      }, () => {
        this.onRefreshComplete();
        this.translate.get('ERROR_NETWORK')
          .subscribe(str => this.showToast(str));
      });
  }

  async updateInstallation() {

    try {

      const objWindow = this.windowRef.nativeWindow;

      if (objWindow.ParsePushPlugin) {

        const location = this.geolocationService.toParseGeoPoint(this.location);

        const id = await this.installationService.getId();

        const res = await this.installationService.save(id, { location })
        console.log('Installation updated', res);
      }

    } catch (error) {
      console.log(error);
    }
  }

  async loadNearbyPlaces() {

    try {

      const location = await this.geolocationService.getCurrentPosition();

      if (location) {

        const params = {
          latitude: location.latitude,
          longitude: location.longitude,
          limit: 12,
        };
        this.location = location;
        this.updateInstallation();

        const radiusSearch = environment.radiusSearch;

        if (radiusSearch) {

          if (this.params.unit === 'km') {
            this.params.maxDistance = radiusSearch / 1000;
          } else if (this.params.unit === 'mi') {
            this.params.maxDistance = radiusSearch / 1609;
          }
        }

        this.nearbyPlaces = await this.placeService.load(params);
      }

    } catch (err) {
      console.warn(err);
    }

  }

  onLoadMore(event: any = {}) {
    this.infiniteScroll = event.target;
    this.loadMoreRandomPlaces();
  }

  onPlaceTouched(place: Place) {
    this.navigateToRelative('/places/' + place.id + '/' + place.slug);
  }

  async onPresentLocationSelectModal() {

    await this.showLoadingView({ showOverlay: true });

    const modal = await this.modalCtrl.create({
      component: LocationSelectPage
    });

    await modal.present();

    this.dismissLoadingView();

    const { data } = await modal.onDidDismiss();

    if (data) {

      const location: LocationAddress = {
        address: data.formatted_address,
        latitude: data.geometry.location.lat(),
        longitude: data.geometry.location.lng(),
      };

      this.navigateToRelative('./places', {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });
    }
  }

  onSlideTouched(slide: Slide) {

    if (slide.url && slide.type === 'url') {
      this.openUrl(slide.url);
    } else if (slide.place && slide.type === 'place') {
      this.onPlaceTouched(slide.place);
    } else {
      // no match...
    }
  }

}
