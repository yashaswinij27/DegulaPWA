import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PlaceUserListPage } from './place-user-list';
import { SharedModule } from '../../shared.module'; 
@NgModule({
  declarations: [
    PlaceUserListPage,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: PlaceUserListPage
      }
    ])
  ]
})
export class PlaceUserListPageModule {}
