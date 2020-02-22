import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PlaceAddPage } from './place-add';
import { SharedModule } from '../../shared.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    PlaceAddPage,
  ],
  imports: [
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: PlaceAddPage
      }
    ])
  ]
})
export class PlaceAddPageModule {}
