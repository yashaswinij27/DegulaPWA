import { Injectable } from '@angular/core';
import { Geolocation, GeolocationOptions, Coordinates } from '@ionic-native/geolocation/ngx';
import { Diagnostic } from "@ionic-native/diagnostic/ngx";
import { Platform } from "@ionic/angular";
import * as Parse from 'parse';
import { LocalStorage } from './local-storage';
import { LocationAddress } from '../models/location-address';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  private lastPosition: LocationAddress;

  constructor(private geolocation: Geolocation,
    private platform: Platform,
    private diagnostic: Diagnostic,
    private storage: LocalStorage) { }

  async getCurrentPosition(): Promise<LocationAddress> {

    if (!this.lastPosition) {
      try {
        const savedPosition = await this.storage.getLastPosition();

        if (savedPosition) {
          this.lastPosition = savedPosition;
        }

      } catch (error) {
        console.warn(error);
      }
    }

    if (this.lastPosition) {
      const diff = new Date().getTime() - this.lastPosition.timestamp;
      const minutesDiff = Math.floor(diff / 1000 / 60);
      if (minutesDiff <= 15) return this.lastPosition;
    }

    let isGranted = true;

    if (this.platform.is("cordova")) {
      await this.platform.ready();

      const isLocationAuthorized = await this.diagnostic.isLocationAuthorized();

      if (!isLocationAuthorized) {
        const status = await this.diagnostic.requestLocationAuthorization();
        isGranted = this.diagnostic.permissionStatus.GRANTED === status;
      } else {
        isGranted = isLocationAuthorized;
      }
    }

    if (!isGranted) return null;

    try {

      const options: GeolocationOptions = {
        enableHighAccuracy: true,
        timeout: 7000, // 7 sec
        maximumAge: 15 * 60 * 1000, // 15 minutes
      };

      const pos = await this.geolocation.getCurrentPosition(options);

      this.lastPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        timestamp: pos.timestamp,
      };

      await this.storage.setLastPosition(this.lastPosition);

    } catch (error) {
      console.warn(error);
    }

    return this.lastPosition;

  }

  toParseGeoPoint(coords: Coordinates): Parse.GeoPoint {
    return new Parse.GeoPoint(coords.latitude, coords.longitude);
  }
}
