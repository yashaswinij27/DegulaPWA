import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HomePage } from './home';
import { SharedModule } from '../../shared.module';
import { LocationSelectPageModule } from '../location-select/location-select.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    SharedModule,
    LocationSelectPageModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage
      }
    ])
  ],
  declarations: [HomePage]
})
export class HomePageModule { }
