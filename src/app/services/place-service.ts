import { Injectable } from '@angular/core';
import * as Parse from 'parse';
import { Category } from './categories';

@Injectable({
  providedIn: 'root'
})
export class Place extends Parse.Object {

  constructor() {
    super('Place');
  }

  static getInstance() {
    return this;
  }

  getSlug(): string {
    let slug = '1/home/places/' + this.id;

    if (this.slug) {
      slug += '/' + this.slug;
    }

    return slug;
  }

  distance(location: Coordinates, unit: string = 'km') {

    if (!location) return null;

    const geoPoint = new Parse.GeoPoint({
      latitude: location.latitude,
      longitude: location.longitude
    });

    if (unit === 'km') {
      return this.location.kilometersTo(geoPoint).toFixed(1) + ' ' + unit;
    } else {
      return this.location.milesTo(geoPoint).toFixed(1) + ' ' + unit;
    }
  }

  like(place: Place) {
    return Parse.Cloud.run('likePlace', { placeId: place.id });
  }

  isLiked(place: Place): Promise<boolean> {
    return Parse.Cloud.run('isPlaceLiked', { placeId: place.id });
  }

  isStarred(place: Place): Promise<boolean> {
    return Parse.Cloud.run('isPlaceStarred', { placeId: place.id });
  }

  loadOne(id: string): Promise<Place> {
    const query = new Parse.Query(Place);
    query.equalTo('status', 'Approved');
    query.include('category');
    return query.get(id);
  }

  load(params: any = {}): Promise<Place[]> {

    const page = params.page || 0;
    const limit = params.limit || 100;
    const status = params.status || 'Approved';

    const queries = [];

    if (params.tag) {
      const queryTag = new Parse.Query(Place);
      queryTag.contains('tags', params.tag);
      queries.push(queryTag);

      const queryCanonical = new Parse.Query(Place);
      queryCanonical.contains('canonical', params.tag);
      queries.push(queryCanonical);
    }

    let query = new Parse.Query(Place);

    if (queries.length) {
      query = Parse.Query.or(...queries);
    }

    if (Array.isArray(status)) {
      query.containedIn('status', status);
    } else {
      query.equalTo('status', status);
    }

    if (params.ratingMin) {
      query.greaterThanOrEqualTo('ratingAvg', Number(params.ratingMin));
    }

    if (params.ratingMax) {
      query.lessThanOrEqualTo('ratingAvg', Number(params.ratingMax));
    }

    if (params.cat) {

      if (Array.isArray(params.cat)) {

        const categories = params.cat.map((id: string) => {
          const obj = new Category;
          obj.id = id;
          return obj;
        });

        if (categories.length) {
          query.containedIn('category', categories);
        }
      } else if (typeof params.cat === 'string') {
        const category = new Category;
        category.id = params.cat;
        query.equalTo('category', category);
      }

    }

    if (params.category) {
      query.equalTo('category', params.category);
    }

    if (params.featured === '1') {
      query.equalTo('isFeatured', true);
    }

    if (params.user) {
      query.equalTo('user', params.user);
    }

    if (params.canonical && params.canonical !== '') {
      query.contains('canonical', params.canonical);
    }

    if (params.bounds) {

      const southwest = new Parse.GeoPoint(
        params.bounds[0].latitude,
        params.bounds[0].longitude
      );

      const northeast = new Parse.GeoPoint(
        params.bounds[1].latitude,
        params.bounds[1].longitude
      );

      query.withinGeoBox('location', southwest, northeast);

    } else if (params.latitude && params.longitude) {

      const point = new Parse.GeoPoint({
        latitude: params.latitude,
        longitude: params.longitude,
      });

      if (params.unit === 'km' && params.maxDistance) {
        query.withinKilometers('location', point, params.maxDistance);
      } else if (params.unit == 'mi' && params.maxDistance) {
        query.withinMiles('location', point, params.maxDistance);
      } else {
        query.near('location', point);
      }

    }

    if (params.sortBy && params.sortByField !== 'location') {
      if (params.sortBy === 'asc') {
        query.ascending(params.sortByField);
      } else if (params.sortBy === 'desc') {
        query.descending(params.sortByField);
      }
    }

    if (!params.latitude && !params.longitude) {
      query.descending('createdAt');
    }

    query.skip(page * limit);
    query.limit(limit);

    query.include('category');
    query.doesNotExist('deletedAt');

    return query.find();
  }

  count(params: any = {}): Promise<number> {

    const status = params.status || 'Approved';

    const query = new Parse.Query(Place);

    if (Array.isArray(status)) {
      query.containedIn('status', status);
    } else {
      query.equalTo('status', status);
    }

    if (params.ratingMin) {
      query.greaterThanOrEqualTo('ratingAvg', params.ratingMin);
    }

    if (params.ratingMax) {
      query.lessThanOrEqualTo('ratingAvg', params.ratingMax);
    }

    if (params.cat) {

      if (Array.isArray(params.cat)) {

        const categories = params.cat.map((id: string) => {
          const obj = new Category;
          obj.id = id;
          return obj;
        });

        if (categories.length) {
          query.containedIn('category', categories);
        }
      } else if (typeof params.cat === 'string') {
        const category = new Category;
        category.id = params.cat;
        query.equalTo('category', category);
      }
    }

    if (params.category) {
      query.equalTo('category', params.category);
    }

    if (params.featured === '1') {
      query.equalTo('isFeatured', true);
    }

    if (params.user) {
      query.equalTo('user', params.user);
    }

    if (params.canonical && params.canonical !== '') {
      query.contains('canonical', params.canonical);
    }

    if (params.bounds) {

      const southwest = new Parse.GeoPoint(
        params.bounds[0].latitude,
        params.bounds[0].longitude
      );

      const northeast = new Parse.GeoPoint(
        params.bounds[1].latitude,
        params.bounds[1].longitude
      );

      query.withinGeoBox('location', southwest, northeast);

    } else if (params.latitude && params.longitude) {

      const point = new Parse.GeoPoint({
        latitude: params.latitude,
        longitude: params.longitude,
      });

      if (params.maxDistance) {
        if (params.unit === 'km') {
          query.withinKilometers('location', point, params.maxDistance);
        } else if (params.unit === 'mi') {
          query.withinMiles('location', point, params.maxDistance);
        }
      }

    } else {
      query.descending('createdAt');
    };

    query.include('category');
    query.doesNotExist('deletedAt');

    return query.count();
  }

  loadFavorites(params: any = {}): Promise<Place[]> {

    const page = params.page || 0;
    const limit = params.limit || 100;

    const query = new Parse.Query(Place);
    query.equalTo('status', 'Approved');
    query.equalTo('likes', Parse.User.current());

    query.skip(page * limit);
    query.limit(limit);
    query.include('category');
    query.doesNotExist('deletedAt');

    return query.find();
  }

  get title(): string {
    return this.get('title');
  }

  set title(val) {
    this.set('title', val);
  }

  get description(): string {
    return this.get('description');
  }

  set description(val) {
    this.set('description', val);
  }

  get phone(): string {
    return this.get('phone');
  }

  set phone(val) {
    this.set('phone', val);
  }

  get website(): string {
    return this.get('website');
  }

  set website(val) {
    this.set('website', val);
  }

  get address(): string {
    return this.get('address');
  }

  set address(val) {
    this.set('address', val);
  }

  get category() {
    return this.get('category');
  }

  set category(val) {
    this.set('category', val);
  }

  get image() {
    return this.get('image');
  }

  set image(val) {
    this.set('image', val);
  }

  get images() {
    return this.get('images');
  }

  set images(val) {
    this.set('images', val);
  }

  get location() {
    return this.get('location');
  }

  set location(val) {
    var geoPoint = new Parse.GeoPoint({
      latitude: val.lat,
      longitude: val.lng
    });
    this.set('location', geoPoint);
  }

  get imageTwo() {
    return this.get('imageTwo');
  }

  get imageThree() {
    return this.get('imageThree');
  }

  get imageFour() {
    return this.get('imageFour');
  }

  get imageThumb() {
    return this.get('imageThumb');
  }

  get ratingCount() {
    return this.get('ratingCount');
  }

  get ratingTotal() {
    return this.get('ratingTotal');
  }

  get ratingAvg(): number {
    return this.get('ratingAvg');
  }

  get status() {
    return this.get('status');
  }

  get facebook() {
    return this.get('facebook');
  }

  get youtube() {
    return this.get('youtube');
  }

  get instagram() {
    return this.get('instagram');
  }

  get longDescription() {
    return this.get('longDescription');
  }

  get slug() {
    return this.get('slug');
  }

  get rating() {
    if (!this.ratingCount && !this.ratingTotal) return 0;
    return Math.round(this.ratingTotal / this.ratingCount);
  }

}

Parse.Object.registerSubclass('Place', Place);
