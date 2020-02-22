
import { Component, Injector, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { BasePage } from '../base-page/base-page';
import { IonContent, IonSearchbar } from '@ionic/angular';
import { Place } from '../../services/place-service';
import { Category } from 'src/app/services/categories';
import { GeolocationService } from 'src/app/services/geolocation.service';
import { Subject, Observable, merge } from 'rxjs';
import { FilterPlacePage } from '../filter-place/filter-place.page';
import { LocationAddress } from 'src/app/models/location-address';
import { LocationSelectPage } from '../location-select/location-select';
import { LocalStorage } from 'src/app/services/local-storage';
import Utils from 'src/app/utils';
import { environment } from 'src/environments/environment';
import { GeocoderService } from 'src/app/services/geocoder.service';
import {
  trigger,
  style,
  animate,
  transition,
  query,
  stagger
} from '@angular/animations';

@Component({
  selector: 'place-list-page',
  templateUrl: './place-list.html',
  styleUrls: ['./place-list.scss'],
  animations: [
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', style({ opacity: 0, transform: `translate3d(0,10px,0)` }), { optional: true }),
        query(':enter', stagger('100ms', [animate('300ms', style({ opacity: 1, transform: `translate3d(0,0,0)` }))]), { optional: true })
      ])
    ])
  ]
})
export class PlaceListPage extends BasePage {

  @ViewChild(IonSearchbar, { static: true }) ionSearchBar: IonSearchbar;
  @ViewChild(IonContent, { static: true }) container: IonContent;

  public params: any = {};
  public category: Category;
  public skeletonArray: any;
  public places: Place[] = [];
  public location: LocationAddress;

  public contentLoaded: Subject<any>;
  public loadAndScroll: Observable<any>;

  public sortOptions: Array<any>;
  public selectedSortOption: any;

  constructor(injector: Injector,
    private geolocationService: GeolocationService,
    private localStorage: LocalStorage,
    private locationService: Location,
    private geocoderService: GeocoderService,
    private placeService: Place) {
    super(injector);
    this.skeletonArray = Array(12);
    this.params.limit = 20;
    this.params.page = 0;
  }

  ngOnInit() {
    this.setupQueryParams();
    this.setupObservables();
    this.buildSortOptions();
  }

  buildSortOptions() {

    this.sortOptions = [{
      sortBy: 'desc', sortByField: 'createdAt',
    }, {
      sortBy: 'desc', sortByField: 'ratingAvg',
    }, {
      sortBy: 'asc', sortByField: 'location',
    }];

    if (this.params.sortBy && this.params.sortByField) {
      this.selectedSortOption = {
        sortBy: this.params.sortBy,
        sortByField: this.params.sortByField,
      };
    } else if (this.params.latitude && this.params.longitude) {
      this.selectedSortOption = this.sortOptions[2];
    } else {
      this.selectedSortOption = this.sortOptions[0];
    }
  }

  onSortOptionTouched(event: any = {}) {

    const option = Object.assign({}, event.detail.value);
    delete option.id;

    this.params = {
      ...this.params,
      ...option
    };

    this.onReload();
    this.reloadUrl();
  }

  compareSortOption(o1: any, o2: any) {
    return o1 && o2 ? (o1.sortBy === o2.sortBy && o1.sortByField === o2.sortByField) : o1 === o2;
  };

  setupQueryParams() {

    const featured = this.getQueryParams().featured;
    if (featured) {
      this.params.featured = featured;
    }

    const cat = this.getQueryParams().cat;
    if (cat) {
      this.params.cat = cat;
    }

    const ratingMin = this.getQueryParams().ratingMin;
    if (ratingMin) {
      this.params.ratingMin = ratingMin;
    }

    const ratingMax = this.getQueryParams().ratingMax;
    if (ratingMax) {
      this.params.ratingMax = ratingMax;
    }

    const maxDistance = this.getQueryParams().maxDistance;
    if (maxDistance) {
      this.params.maxDistance = maxDistance;
    }

    let lat = this.getQueryParams().latitude;
    let lng = this.getQueryParams().longitude;

    if (lat && lng) {
      lat = Number(lat);
      lng = Number(lng);
      this.params.latitude = lat;
      this.params.longitude = lng;
    }

    const address = this.getQueryParams().address;

    if (address) {
      this.params.address = this.getQueryParams().address;
    }

    const sortBy = this.getQueryParams().sortBy;

    if (sortBy) {
      this.params.sortBy = sortBy;
    }

    const sortByField = this.getQueryParams().sortByField;

    if (sortByField) {
      this.params.sortByField = sortByField;
    }

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

  onViewMapButtonTouched() {
    const params: any = this.getFilteredParams();
    this.navigateToRelative('./map', params);
  }

  async ionViewDidEnter() {

    if (this.params.address) {
      this.updateSearchBarValue(this.params.address);
    }

    const title = await this.getTrans('PLACES');
    this.setPageTitle(title);

    this.setMetaTags({
      title: title
    });

    if (!this.places.length) {

      await this.showLoadingView({ showOverlay: false });

      await this.setupDistanceUnit();

      const radiusSearch = environment.radiusSearch;

      if (radiusSearch) {

        if (this.params.unit === 'km' ) {
          this.params.maxDistance = radiusSearch / 1000;
        } else if (this.params.unit === 'mi') {
          this.params.maxDistance = radiusSearch / 1609;
        }
      }

      if (typeof this.params.cat === 'string') {
        this.category = new Category;
        this.category.id = this.params.cat;
        this.category.fetch();
      }

      this.onReload();
    }
  }

  enableMenuSwipe() {
    return false;
  }

  async loadLocation(): Promise<any> {

    try {

      let location = null;

      if (this.params.latitude && this.params.longitude) {
        location = {
          latitude: this.params.latitude,
          longitude: this.params.longitude,
        };
      } else {
        location = await this.geolocationService.getCurrentPosition();
      }

      return location;

    } catch (err) {
      return null;
    }
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

  async onPresentFilterModal() {

    await this.showLoadingView({ showOverlay: true });

    const modal = await this.modalCtrl.create({
      component: FilterPlacePage,
      componentProps: { params: this.getFilteredParams() }
    });

    await modal.present();

    this.dismissLoadingView();

    const { data } = await modal.onDidDismiss();

    if (data) {

      const params = {
        ...this.params,
        ...data
      };

      this.params = params;

      this.showLoadingView({ showOverlay: false });
      this.onReload();
      this.reloadUrl();
    }
  }

  onLoadMore(event: any = {}) {
    this.infiniteScroll = event.target;
    this.params.page++;
    this.loadData();
  }

  async onReload(event: any = {}) {
    this.refresher = event.target;
    this.places = [];
    this.params.page = 0;

    const location = await this.loadLocation();

    if (location) {
      this.location = location;
    }

    if (this.params.sortByField === 'location') {

      if (location) {
        this.params.latitude = location.latitude;
        this.params.longitude = location.longitude;
      } else {
        this.translate.get('ERROR_LOCATION_UNAVAILABLE')
          .subscribe(str => this.showToast(str));
        return this.showErrorView();
      }
    }

    if (this.params.latitude &&
      this.params.longitude &&
      !this.params.address) {
      this.latLngToAddress(location);
    }

    this.loadData();
  }

  async latLngToAddress(location: LocationAddress) {
    try {

      const { display_name } = await this.geocoderService.reverseGeocode({
        lat: location.latitude,
        lng: location.longitude,
      });

      this.params.address = display_name;
      this.updateSearchBarValue(display_name);

    } catch (error) {
      console.warn(error);
    }
  }

  reloadUrl() {
    const urlTree = this.createUrlTree(this.getFilteredParams());
    this.locationService.go(urlTree.toString());
  }

  getFilteredParams() {
    const params = Object.assign({}, this.params);

    const allowed = [
      'featured',
      'ratingMin',
      'ratingMax',
      'maxDistance',
      'latitude',
      'longitude',
      'cat',
      'address',
      'sortBy',
      'sortByField',
    ];

    return Object.keys(params)
      .filter(key => allowed.includes(key))
      .reduce((obj, key) => {
        obj[key] = params[key]
        return obj
      }, {});
  }

  async updateSearchBarValue(val: string) {
    await Utils.sleep(800);
    this.ionSearchBar.value = val;
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

      this.updateSearchBarValue(data.formatted_address);

      const location: LocationAddress = {
        address: data.formatted_address,
        latitude: data.geometry.location.lat(),
        longitude: data.geometry.location.lng(),
      };

      this.params.latitude = location.latitude;
      this.params.longitude = location.longitude;
      this.params.address = location.address;

      this.location = location;

      this.buildSortOptions();

      this.showLoadingView({ showOverlay: false });
      this.onReload();
      this.reloadUrl();
    }
  }

}
