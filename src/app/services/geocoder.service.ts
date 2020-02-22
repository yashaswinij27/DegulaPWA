import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GeocoderService {

  constructor(private httpClient: HttpClient) { }

  public reverseGeocode(coords: { lat: any, lng: any }): Promise<any> {

    const url = 'https://nominatim.openstreetmap.org/reverse?format=json';

    let params = new HttpParams();
    params = params.append('lat', coords.lat.toString());
    params = params.append('lon', coords.lng.toString());

    return this.httpClient.get(url, { params }).toPromise();
  }
}
