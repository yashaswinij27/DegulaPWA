
import { Component, Injector } from '@angular/core';
import { BasePage } from '../base-page/base-page';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { User } from '../../services/user-service';
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook/ngx';
import { ForgotPasswordPage } from '../forgot-password/forgot-password';
import { SignUpPage } from '../sign-up/sign-up';
import { EventBusService, EmitEvent } from 'src/app/services/event-bus.service';
import { AuthService, GoogleLoginProvider } from 'angularx-social-login';
import { GooglePlus } from '@ionic-native/google-plus/ngx';

@Component({
  selector: 'page-sign-in',
  templateUrl: 'sign-in.html',
  styleUrls: ['sign-in.scss']
})
export class SignInPage extends BasePage {

  public form: FormGroup;
  public isLoadingByUsername: boolean = false;
  public isLoadingByFacebook: boolean = false;
  public isLoadingByGoogle: boolean = false;

  constructor(injector: Injector,
    private eventBusService: EventBusService,
    private authService: AuthService,
    private googlePlus: GooglePlus,
    private userService: User,
    private fb: Facebook) {
    super(injector);
  }

  ngOnInit() {
    this.form = new FormGroup({
      username: new FormControl('', Validators.required),
      password: new FormControl('', Validators.required)
    });

    this.eventBusService.on('user:login', () => {
      this.onDismiss();
    });

    this.authService.authState.subscribe(user => {
      if (user) {
        this.loggedIntoGoogle(user);
      }
    });
  }

  enableMenuSwipe(): boolean {
    return false;
  }

  onDismiss() {
    return this.modalCtrl.dismiss();
  }

  onFacebookButtonTouched() {

    if (this.isCordova) {
      this.fb.login(['public_profile'])
      .then((res: FacebookLoginResponse) => this.loggedIntoFacebook(res))
      .catch(e => console.log('Error logging into Facebook', e));
    } else {
      this.userService.loginViaFacebook()
      .then((user: User) => this.loggedViaFacebook(user))
      .catch(e => console.log('Error logging into Facebook', e));
    }
    
  }

  async loggedIntoFacebook(res: FacebookLoginResponse) {

    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + res.authResponse.expiresIn);
    
    const expirationDateFormatted = expirationDate.toISOString();
 
    const facebookAuthData = {
      id: res.authResponse.userID,
      access_token: res.authResponse.accessToken,
      expiration_date: expirationDateFormatted
    };

    try {

      await this.showLoadingView({ showOverlay: false });
      this.isLoadingByFacebook = true;
      
      const user = await this.userService.loginWith('facebook', {
        authData: facebookAuthData
      });

      this.loggedViaFacebook(user);
      this.isLoadingByFacebook = false;
      
    } catch (error) {
      this.loginViaFacebookFailure(error);
      this.isLoadingByFacebook = false;
    }
    
  }

  loginViaFacebookFailure(error: any = {}) {
    console.log('Error logging into Facebook', error);
    this.translate.get('ERROR_UNKNOWN').subscribe(str => this.showToast(str));
    this.showContentView();
  }

  loggedViaFacebook(user: User) {
    this.showContentView();

    const transParams = { username: user.attributes.name };
    
    this.translate.get('LOGGED_IN_AS', transParams)
      .subscribe(str => this.showToast(str));

    this.eventBusService.emit(new EmitEvent('user:login', user));

    this.onDismiss();
  }

  async onGoogleButtonTouched() {
    if (this.isCordova) {
      try {
        const res = await this.googlePlus.login({});
        this.loggedIntoGoogle({
          id: res.userId,
          authToken: res.accessToken
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      this.authService.signIn(GoogleLoginProvider.PROVIDER_ID);
    }
  }

  async loggedIntoGoogle(res: any) {
    console.log("Logged into Google", res);

    try {
      this.isLoadingByGoogle = true;

      const authData = {
        id: res.id,
        access_token: res.authToken
      };

      const user = await this.userService.loginWith("google", { authData });

      this.isLoadingByGoogle = false;

      const transParams = { username: user.name };

      this.translate
        .get("LOGGED_IN_AS", transParams)
        .subscribe(str => this.showToast(str));

      this.eventBusService.emit(new EmitEvent('user:login', user));

    } catch (err) {
      console.log("Error logging into Google", err);
      this.isLoadingByGoogle = false;
      this.translate.get("ERROR_NETWORK").subscribe(str => this.showToast(str));
      this.showContentView();
    }
  }

  async onSubmit() {

    try {

      if (this.form.invalid) {
        const message = await this.getTrans('INVALID_FORM');
        return this.showToast(message);
      }

      await this.showLoadingView({ showOverlay: false });
      this.isLoadingByUsername = true;

      let user = await this.userService.signIn(this.form.value);

      this.showContentView();
      this.isLoadingByUsername = false;

      const transParams = { username: user.name };
      this.translate.get('LOGGED_IN_AS', transParams)
        .subscribe(str => this.showToast(str));

      this.eventBusService.emit(new EmitEvent('user:login', user));

      this.onDismiss();

    } catch (err) {

      if (err.code === 101) {
        this.translate.get('INVALID_CREDENTIALS')
        .subscribe(str => this.showToast(str));
      } else {
        this.translate.get('ERROR_NETWORK')
        .subscribe(str => this.showToast(str));
      }

      this.showContentView();
      this.isLoadingByUsername = false;
    }
  }

  async onPresentForgotPasswordModal() {
    const modal = await this.modalCtrl.create({
      component: ForgotPasswordPage
    });

    return await modal.present();
  }

  async onPresentSignUpModal() {
    const modal = await this.modalCtrl.create({
      component: SignUpPage
    });

    return await modal.present();
  }

}
