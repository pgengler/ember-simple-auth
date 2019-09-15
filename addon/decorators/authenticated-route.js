import { inject as service } from '@ember/service';
import { assert } from '@ember/debug';
import { getOwner } from '@ember/application';
import Configuration from './../configuration';
import { isFastBoot } from '../utils/is-fastboot';

/**
 * If the user is unauthenticated, invoke `callback`
 *
 * @param {ApplicationInstance} owner The ApplicationInstance that owns the service (and possibly fastboot and cookie) service(s)
 * @param {Transition} transition Transition for the user's original navigation
 * @param {(...args: []any) => any} callback Callback that will be invoked if the user is unauthenticated
 */
function runIfUnauthenticated(owner, transition, callback) {
  const isFb = isFastBoot(owner);
  const sessionSvc = owner.lookup('service:session');
  if (!sessionSvc.get('isAuthenticated')) {
    if (isFb) {
      const fastboot = owner.lookup('service:fastboot');
      const cookies = owner.lookup('service:cookies');
      cookies.write('ember_simple_auth-redirectTarget', transition.intent.url, {
        path: '/',
        secure: fastboot.request.protocol === 'https'
      });
    } else {
      sessionSvc.set('attemptedTransition', transition);
    }
    callback();
    return true;
  }
}

/**
  __This decorator is used to make routes accessible only if the session is
  authenticated.__ It defines a `beforeModel` method that aborts the current
  transition and instead transitions to the
  {{#crossLink "Configuration/authenticationRoute:property"}}{{/crossLink}} if
  the session is not authenticated.

  ```js
  // app/routes/protected.js
  import AuthenticatedRoute from 'ember-simple-auth/decorators/authenticated-route';

  @authenticatedRoute
  export default class extends Route {
    // ...
  };
  ```

  @class AuthenticatedRouteDecorator
  @module ember-simple-auth/decorators/authenticated-route
  @public
*/
export const authenticateRoute = () => target => {
  const NewClass = class extends target.prototype {
    /**
      The session service.

      @property session
      @readOnly
      @type SessionService
      @public
    */
    @service session;

    /**
      The route to transition to for authentication. The
      {{#crossLink "AuthenticatedRouteMixin"}}{{/crossLink}} will transition to
      this route when a route that implements the mixin is accessed when the
      route is not authenticated.

      @property authenticationRoute
      @type String
      @default 'login'
      @public
    */
    authenticationRoute = Configuration.authenticationRoute;

    _authRouter() {
      let owner = getOwner(this);
      return owner.lookup('service:router') || owner.lookup('router:main');
    }

    get isFastBoot() {
      return isFastBoot(this);
    }

    /**
      Checks whether the session is authenticated and if it is not aborts the
      current transition and instead transitions to the
      {{#crossLink "Configuration/authenticationRoute:property"}}{{/crossLink}}.
      If the current transition is aborted, this method will save it in the
      session service's
      {{#crossLink "SessionService/attemptedTransition:property"}}{{/crossLink}}
      property so that  it can be retried after the session is authenticated
      (see
      {{#crossLink "ApplicationRouteMixin/sessionAuthenticated:method"}}{{/crossLink}}).
      If the transition is aborted in Fastboot mode, the transition's target
      URL will be saved in a `ember_simple_auth-redirectTarget` cookie for use by
      the browser after authentication is complete.

      __If `beforeModel` is overridden in a route that uses this mixin, the route's
     implementation must call `this._super(...arguments)`__ so that this
     `beforeModel` method is actually executed.

      @method beforeModel
      @param {Transition} transition The transition that lead to this route
      @public
    */
    beforeModel(transition) {
      const didRedirect = runIfUnauthenticated(getOwner(this), transition, () => {
        this.triggerAuthentication();
      });
      if (!didRedirect) {
        return super.beforeModel(...arguments);
      }
    }

    /**
      Triggers authentication; by default this method transitions to the
      `authenticationRoute`. In case the application uses an authentication
      mechanism that does not use an authentication route, this method can be
      overridden.

      @method triggerAuthentication
      @protected
    */
    triggerAuthentication() {
      let authenticationRoute = this.authenticationRoute;
      assert('The route configured as Configuration.authenticationRoute cannot implement the AuthenticatedRouteMixin mixin as that leads to an infinite transitioning loop!', this.routeName !== authenticationRoute);

      this._authRouter.transitionTo(authenticationRoute);
    }
  };

  return Object.setPrototypeOf(target, NewClass.prototype);
};
