import { Component, OnInit, Input, Injector, ViewChild } from '@angular/core';
import { Category } from 'src/app/services/categories';
import { Place } from 'src/app/services/place-service';
import { BasePage } from '../base-page/base-page';
import Utils from 'src/app/utils';
import { GeolocationService } from 'src/app/services/geolocation.service';
import { AccordionComponent } from 'src/app/components/accordion/accordion.component';

interface CheckboxOption {
  id: string,
  name: string,
  isChecked: boolean;
}

@Component({
  selector: 'app-filter-place',
  templateUrl: './filter-place.page.html',
  styleUrls: ['./filter-place.page.scss'],
})

export class FilterPlacePage extends BasePage implements OnInit {

  @ViewChild(AccordionComponent, { static: true }) accordion: AccordionComponent;
  @Input() params: any = {};

  public categories: CheckboxOption[] = [];

  public query: any = {
    distance: 0,
    rating: { lower: 0, upper: 5 },
  };

  public minDistance: number = 0;
  public maxDistance: number = 100;

  public minRating: number = 0;
  public maxRating: number = 5;

  public isLoading: boolean;

  public isLoadingCategories: boolean;
  public isQueryChanged: boolean;
  public isRangeChanged: boolean;

  public count: number = 0;

  constructor(injector: Injector,
    private geolocationService: GeolocationService,
    private placeService: Place,
    private categoryService: Category) {
    super(injector);
  }

  enableMenuSwipe(): boolean {
    return false;
  }

  ngOnInit() {

    this.query.featured = this.params.featured === '1' ? true : false;

    if (this.params.ratingMin) {
      this.query.rating.lower = Number(this.params.ratingMin);
    }

    if (this.params.ratingMax) {
      this.query.rating.upper = Number(this.params.ratingMax);
    }

    if (this.params.maxDistance) {
      this.query.maxDistance = Number(this.params.maxDistance);
    }

    if (this.params.latitude) {
      this.query.latitude = Number(this.params.latitude);
    }

    if (this.params.longitude) {
      this.query.longitude = Number(this.params.longitude);
    }

    if (this.params.cat) {
      this.query.cat = this.params.cat;
    }

    this.loadData();
  }

  onDismiss(query: any = null) {
    this.modalCtrl.dismiss(query);
  }

  async loadData() {

    try {
      const categories = await this.categoryService.load();

      this.categories = categories.map(category => {

        let isChecked = false;

        if (this.query.cat) {

          if (Array.isArray(this.query.cat)) {
            isChecked = this.query.cat.includes(category.id);
          } else {
            isChecked = this.query.cat === category.id;
          }
        }

        const option: CheckboxOption = {
          id: category.id,
          name: category.title,
          isChecked: isChecked,
        };
        return option;
      });

      if (Array.isArray(this.query.cat) && this.query.cat.length) {
        this.accordion.toggle();
      }

      this.loadCount();

    } catch (error) {
      console.log(error.message);
    }

  }

  async onCategoryChanged(event: any = {}) {

    if (event.target.className.includes('interactive')) {

      const categories = this.categories
        .filter(category => category.isChecked)
        .map(category => category.id);

      this.query.cat = categories;

      this.loadCount();

    }

  }

  async onQueryChanged(event: any = {}) {
    if (event.target.className.includes('interactive')) {
      this.loadCount();
    }
  }

  async onRangeChanged(event: any = {}) {
    this.loadCount();
  }

  async loadCount() {
    try {
      this.isLoading = true;

      if (!this.query.latitude && !this.query.longitude) {
        const location = await this.geolocationService.getCurrentPosition();
        this.query.latitude = location.latitude;
        this.query.longitude = location.longitude;
      }
      
      await Utils.sleep(1500);
      this.count = await this.placeService.count(this.getPlaceQueryParams());
      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
    }
  }

  getPlaceQueryParams() {
    const params: any = {};

    params.featured = this.query.featured ? '1' : '0';
    params.ratingMin = this.query.rating.lower;
    params.ratingMax = this.query.rating.upper;
    params.maxDistance = this.query.maxDistance;
    params.latitude = this.query.latitude;
    params.longitude = this.query.longitude;
    params.cat = this.query.cat;
    params.unit = this.preference.unit;

    return params;
  }

  onApplyButtonTouched() {
    this.onDismiss(this.getPlaceQueryParams());
  }

  trackByFn(index: number, item: any) {
    if (!item) return null;
    return item.id;
  }

}
