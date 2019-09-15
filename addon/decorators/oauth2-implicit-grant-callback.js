import { inject as service } from '@ember/service';
import location from '../utils/location';
import { isFastBoot } from '../utils/is-fastboot';

function _parseResponse(locationHash) {
  let params = {};
  const query = locationHash.substring(locationHash.indexOf('?'));
  const regex = /([^#?&=]+)=([^&]*)/g;
  let match;

  // decode all parameter pairs
  while ((match = regex.exec(query)) !== null) {
    params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
  }

  return params;
}

/**
  __This decorator is used in the callback route when using OAuth 2.0 Implicit
  Grant authentication.__ It implements the
  {{#crossLink "OAuth2ImplicitGrantCallbackDecorator/activate:method"}}{{/crossLink}}
  method that retrieves and processes authentication parameters, such as
  `access_token`, from the hash parameters provided in the callback URL by
  the authentication server. The parameters are then passed to the
  {{#crossLink "OAuth2ImplicitGrantAuthenticator"}}{{/crossLink}}

  @class OAuth2ImplicitGrantCallbackDecorator
  @module ember-simple-auth/decorators/oauth2-implicit-grant-callback
  @public
*/

export const oauth2ImplicitGrantCallback = () => target => {
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
      The authenticator that should be used to authenticate the callback. This
      must be a subclass of the
      {{#crossLink "OAuth2ImplicitGrantAuthenticator"}}{{/crossLink}}
      authenticator.

      @property authenticator
      @type String
      @default null
      @public
    */
    authenticator = null;

    /**
      Any error that potentially occurs during authentication will be stored in
      this property.

      @property error
      @type String
      @default null
      @public
    */
    error = null;

    /**
      Passes the hash received with the redirection from the authentication
      server to the
      {{#crossLink "OAuth2ImplicitGrantAuthenticator"}}{{/crossLink}} and
      authenticates the session with the authenticator.

      @method activate
      @public
    */
    activate() {
      if (isFastBoot(this)) {
        return;
      }

      let hash = _parseResponse(location().hash);

      this.session.authenticate(this.authenticator, hash).catch((err) => {
        this.error = err;
      });
    }
  };

  return Object.setPrototypeOf(target, NewClass.prototype);
};
