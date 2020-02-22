
/// <reference types="@types/googlemaps" />
import { Component, Injector, ElementRef, ViewChild, NgZone } from '@angular/core';
import { BasePage } from '../base-page/base-page';
import { Place } from '../../services/place-service';
import { MapStyle } from '../../services/map-style';
import { ParseFile } from '../../services/parse-file-service';
import { Category } from '../../services/categories';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import { GeolocationService } from 'src/app/services/geolocation.service';
import { IonSearchbar } from '@ionic/angular';
import { EmitEvent, EventBusService } from 'src/app/services/event-bus.service';
import {
  trigger,
  style,
  animate,
  transition,
  query,
  stagger
} from '@angular/animations';

@Component({
  selector: 'page-place-add',
  templateUrl: './place-add.html',
  styleUrls: ['./place-add.scss'],
  animations: [
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', style({ opacity: 0, transform: `translate3d(0,10px,0)` }), { optional: true }),
        query(':enter', stagger('100ms', [animate('300ms', style({ opacity: 1, transform: `translate3d(0,0,0)` }))]), { optional: true })
      ])
    ])
  ]
})
export class PlaceAddPage extends BasePage {

  @ViewChild('map', { static: true }) mapElement: ElementRef;
  @ViewChild(IonSearchbar, { static: true }) searchBar: IonSearchbar;

  protected location: { lat?: number, lng?: number } = {};

  protected map: google.maps.Map;
  protected geocoder: google.maps.Geocoder;
  protected marker: google.maps.Marker;
  protected autocompleteService: google.maps.places.AutocompleteService;
  protected placesService: google.maps.places.PlacesService;
  protected mapInitialised: boolean = false;

  public suggestions: any = [];

  public form: FormGroup;
  public categories: Category[] = [];
  public slidesConfig = {};
  public mainUpload: ParseFile;
  public uploads: Array<{ file: ParseFile }>;

  public isSaving: boolean;

  constructor(injector: Injector,
    private zone: NgZone,
    private eventBusService: EventBusService,
    private geolocationService: GeolocationService,
    private categoryService: Category) {
    super(injector);
  }

  enableMenuSwipe() {
    return true;
  }

  async ionViewDidEnter() {

    const title = await this.getTrans('ADD_PLACE');
    this.setPageTitle(title);

    this.setMetaTags({
      title: title
    });
  }

  ngOnInit() {

    this.setupImages();
    this.setupForm();

    if (typeof google == 'undefined' || typeof google.maps == 'undefined') {
      this.loadGoogleMaps()
    } else {
      this.initMap();
    }

    this.loadCategories();
  }

  setupImages() {
    this.uploads = Array
      .from({ length: 9 })
      .map(i => { return { file: null } });
  }

  setupForm() {
    this.form = new FormGroup({
      name: new FormControl('', Validators.required),
      category: new FormControl(null, Validators.required),
      description: new FormControl('', Validators.required),
      address: new FormControl(''),
      phone: new FormControl(''),
      website: new FormControl(''),
    });
  }

  onMainFileUploaded(file: ParseFile) {
    this.mainUpload = file;
  }

  onFileUploaded(file: ParseFile, upload: any) {
    upload.file = file;
  }

  async loadCategories() {
    try {
      this.categories = await this.categoryService.load();
    } catch (error) {
      console.warn(error.message);
    }
  }

  compareCategory(category: Category, category1: Category): boolean {
    return category && category1 ? category.id === category1.id : category === category1;
  }

  loadGoogleMaps() {

    window['mapInit'] = () => {
      this.initMap();
    }

    const apiKey = environment.googleMapsApiKey;

    let script = document.createElement('script');
    script.id = 'googleMaps';
    script.src = `https://maps.google.com/maps/api/js?key=${apiKey}&callback=mapInit&libraries=places`;
    document.body.appendChild(script);

  }

  async initMap() {

    this.geocoder = new google.maps.Geocoder();
    this.mapInitialised = true;

    const mapOptions: any = {
      styles: MapStyle.light(),
      zoom: 2,
      center: { lat: 0, lng: 0 },
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

    google.maps.event.addListener(this.map, 'dragend', () => {

      const center = this.map.getCenter();

      this.setMarkerPosition(center);
      this.location.lat = center.lat();
      this.location.lng = center.lng();

      this.geocoder.geocode({ location: center }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {

        if (status === google.maps.GeocoderStatus.OK) {
          const target = results[0];
          this.searchBar.value = target.formatted_address;
        }
      });

    });

    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.placesService = new google.maps.places.PlacesService(this.map);

    try {

      const coords = await this.geolocationService.getCurrentPosition();

      if (!coords) {
        return this.translate.get('ERROR_LOCATION_UNAVAILABLE')
          .subscribe(str => this.showToast(str));
      }

      this.location.lat = coords.latitude;
      this.location.lng = coords.longitude;

      this.setMarkerPosition(this.location);

      this.map.panTo({
        lat: coords.latitude,
        lng: coords.longitude
      });
      this.map.setZoom(15);

    } catch (err) {

    }
  }

  setMarkerPosition(position: any) {

    if (!this.marker) {
      this.marker = new google.maps.Marker({
        icon: {
          url: './assets/img/pin.png',
          scaledSize: new google.maps.Size(32, 32),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(0, 0)
        },
        position: position,
        map: this.map,
      });
    } else {
      this.marker.setPosition(position);
    }
  }

  onSuggestionTouched(suggestion: any) {

    if (!this.mapInitialised) return;

    this.suggestions = [];

    this.placesService.getDetails({ placeId: suggestion.place_id }, (details: any) => {

      this.zone.run(() => {

        const location = details.geometry.location;

        this.searchBar.value = details.formatted_address;

        this.setMarkerPosition(location);

        this.map.panTo(location);
        this.map.setZoom(15);

        this.location.lat = location.lat();
        this.location.lng = location.lng();
      });

    });

  }

  onSearchAddress(event: any = {}) {

    if (!this.mapInitialised) return;

    const query = event.target.value;

    if (query && query.length >= 3) {

      const config = {
        input: query,
        types: ['geocode'],
      };

      this.autocompleteService.getPlacePredictions(config, (predictions: any) => {
        this.zone.run(() => {
          if (predictions) this.suggestions = predictions;
        });
      });

    }
  }

  preparePlaceData(): Place {

    let place = new Place;

    place.title = this.form.value.name;
    place.category = this.form.value.category;
    place.description = this.form.value.description;
    place.address = this.form.value.address;
    place.website = this.form.value.website;
    place.phone = this.form.value.phone;
    place.image = this.mainUpload;

    place.images = this.uploads
      .filter(item => item.file)
      .map(item => item.file);

    if (this.location) {

      let position = {
        lat: this.location.lat,
        lng: this.location.lng
      };

      place.location = position;
    }

    return place;
  }

  async onSubmit() {

    if (this.form.invalid) {
      const trans = await this.getTrans('INVALID_FORM');
      return this.showToast(trans);
    }

    if (!this.location) {
      const trans = await this.getTrans('INVALID_LOCATION');
      return this.showToast(trans);
    }

    if (!this.mainUpload) {
      const trans = await this.getTrans('INVALID_PHOTO');
      return this.showToast(trans);
    }

    try {

      this.isSaving = true;

      const place = this.preparePlaceData();
      await place.save();

      this.eventBusService.emit(new EmitEvent('place:add'));

      this.form.reset();

      this.isSaving = false;

      const trans = await this.getTrans(['GOOD_JOB', 'PLACE_ADDED', 'OK'])

      const sweetAlertOptions: SweetAlertOptions = {
        title: trans.GOOD_JOB,
        text: trans.PLACE_ADDED,
        confirmButtonText: trans.OK,
        icon: 'success',
        heightAuto: false,
        customClass: {
          popup: 'fade-in'
        },
      };

      await Swal.fire(sweetAlertOptions);

      this.goBack();

    } catch (err) {
      this.isSaving = false;
      this.translate.get('ERROR_NETWORK').subscribe(str => this.showToast(str));
    }

  }

}
