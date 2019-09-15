import { inject as service } from '@ember/service';
import { assert } from '@ember/debug';
import Configuration from './../configuration';
import { getOwner } from '@ember/application';

/**
 *
 * @param {ApplicationInstance} owner The ApplicationInstance that owns the session service
 * @param {(...args: [any]) => any} callback Callback that will be invoked if the user is authenticated
 */
function runIfAuthenticated(owner, callback) {
  const sessionSvc = owner.lookup('service:session');
  if (sessionSvc.get('isAuthenticated')) {
    callback();
    return true;
  }
}

/**
  __This decorator is used to make routes accessible only if the session is
  not authenticated__ (e.g., login and registration routes). It defines a
  `beforeModel` method that aborts the current transition and instead
  transitions to the
  {{#crossLink "Configuration/routeIfAlreadyAuthenticated:property"}}{{/crossLink}}
  if the session is authenticated.

  ```js
  // app/routes/login.js
  import unauthenticatedRoute from 'ember-simple-auth/decorators/unauthenticated-route';

  export default @unauthenticatedRoute class extends Route {
    // ...
  };
  ```

  @class UnauthenticatedRouteDecorator
  @module ember-simple-auth/decorators/unauthenticated-route
  @public
*/
export const unauthenticatedRoute = () => target => {
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
      The route to transition to if a route that implements the
      {{#crossLink "UnauthenticatedRouteMixin"}}{{/crossLink}} is accessed when
      the session is authenticated.

      @property routeIfAlreadyAuthenticated
      @type String
      @default 'index'
      @public
    */
    routeIfAlreadyAuthenticated = Configuration.routeIfAlreadyAuthenticated;

    /**
      Checks whether the session is authenticated and if it is aborts the current
      transition and instead transitions to the
      {{#crossLink "Configuration/routeIfAlreadyAuthenticated:property"}}{{/crossLink}}.

      __If `beforeModel` is overridden in a route that uses this mixin, the route's
     implementation must call `this._super(...arguments)`__ so that the mixin's
     `beforeModel` method is actually executed.

      @method beforeModel
      @public
    */
    beforeModel() {
      const didRedirect = runIfAuthenticated(getOwner(this), () => {
        assert('The route configured as Configuration.routeIfAlreadyAuthenticated cannot implement the UnauthenticatedRouteMixin mixin as that leads to an infinite transitioning loop!', this.routeName !== this.routeIfAlreadyAuthenticated);

        this.transitionTo(this.routeIfAlreadyAuthenticated);
      });
      if (!didRedirect) {
        return super.beforeModel(...arguments);
      }
    }
  };

  return Object.setPrototypeOf(target, NewClass.prototype);
};
