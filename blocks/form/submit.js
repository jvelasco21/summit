import { DEFAULT_THANK_YOU_MESSAGE, getRouting, getSubmitBaseUrl } from './constant.js';

let formDetails = '';

export function submitSuccess(e, form) {
  const { payload } = e;
  const redirectUrl = form.dataset.redirectUrl || payload?.body?.redirectUrl;
  const thankYouMsg = form.dataset.thankYouMsg || payload?.body?.thankYouMessage;
  if (redirectUrl) {
    window.location.assign(encodeURI(redirectUrl));
  } else {
    let thankYouMessage = form.parentNode.querySelector('.form-message.success-message');
    if (!thankYouMessage) {
      thankYouMessage = document.createElement('div');
      thankYouMessage.className = 'form-message success-message';
    }
    thankYouMessage.innerHTML = thankYouMsg || DEFAULT_THANK_YOU_MESSAGE;
    form.parentNode.insertBefore(thankYouMessage, form);
    if (thankYouMessage.scrollIntoView) {
      thankYouMessage.scrollIntoView({ behavior: 'smooth' });
    }
    form.reset();
  }
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

export function submitFailure(e, form) {
  let errorMessage = form.querySelector('.form-message.error-message');
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.className = 'form-message error-message';
  }
  errorMessage.innerHTML = 'Some error occured while submitting the form'; // TODO: translation
  form.prepend(errorMessage);
  errorMessage.scrollIntoView({ behavior: 'smooth' });
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

function getFieldValue(fe, payload) {
  if (fe.type === 'radio') {
    return fe.form.elements[fe.name].value;
  } if (fe.type === 'checkbox') {
    if (fe.checked) {
      if (payload[fe.name]) {
        return `${payload[fe.name]},${fe.value}`;
      }
      return fe.value;
    }
  } else if (fe.type !== 'file') {
    return fe.value;
  }
  return null;
}

function constructPayload(form) {
  const payload = { __id__: generateUnique() };
  [...form.elements].forEach((fe) => {
    if (fe.name && !fe.matches('button') && !fe.disabled && fe.tagName !== 'FIELDSET') {
      const value = getFieldValue(fe, payload);
      if (fe.closest('.repeat-wrapper')) {
        payload[fe.name] = payload[fe.name] ? `${payload[fe.name]},${fe.value}` : value;
      } else {
        payload[fe.name] = value;
      }
    }
  });
  return { payload };
}

async function prepareRequest(form) {
  const { payload } = constructPayload(form);
  const {
    branch, site, org, tier,
  } = getRouting();
  const headers = {
    'Content-Type': 'application/json',
    'x-adobe-routing': `tier=${tier},bucket=${branch}--${site}--${org}`,
  };
  const body = { data: payload };
  let url;
  let baseUrl = getSubmitBaseUrl();
  if (!baseUrl && org && site) {
    baseUrl = 'https://forms.adobe.com/adobe/forms/af/submit/';
    headers['x-adobe-routing'] = `tier=${tier},bucket=${branch}--${site}--${org}`;
    url = baseUrl + btoa(form.dataset.action);
  } else {
    url = form.dataset.action;
  }
  return { headers, body, url };
}

async function submitDocBasedForm(form, captcha) {
  try {
    const { headers, body, url } = await prepareRequest(form, captcha);
    let token = null;
    if (captcha) {
      token = await captcha.getToken();
      body.data['g-recaptcha-response'] = token;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (response.ok) {
      submitSuccess(response, form);
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    submitFailure(error, form);
  }
}

export async function handleSubmit(e, form, captcha) {
  e.preventDefault();
  const valid = form.checkValidity();
  if (valid) {
    e.submitter?.setAttribute('disabled', '');
    if (form.getAttribute('data-submitting') !== 'true') {
      form.setAttribute('data-submitting', 'true');

      // hide error message in case it was shown before
      form.querySelectorAll('.form-message.show').forEach((el) => el.classList.remove('show'));

      if (form.dataset.source === 'sheet') {
        await submitDocBasedForm(form, captcha);
      }

      formDetails = form.querySelector("#details").value;
      
      triggerImg(formDetails);
    }
  } else {
    const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
    if (firstInvalidEl) {
      firstInvalidEl.focus();
      firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function triggerImg(formDetails) {
  (async () => {
    const accessToken = 'eyJhbGciOiJSUzI1NiIsIng1dSI6Imltc19uYTEta2V5LWF0LTEuY2VyIiwia2lkIjoiaW1zX25hMS1rZXktYXQtMSIsIml0dCI6ImF0In0.eyJpZCI6IjE3Mzk0NzA0ODE3NTZfZThjMzI0YjUtODI5My00NmQzLWE2MzktODM1ZDUxNGEwNjYxX3VlMSIsIm9yZyI6IkEwQjQxRTg2NjczQ0U1QkUwQTQ5NUVGMUBBZG9iZU9yZyIsInR5cGUiOiJhY2Nlc3NfdG9rZW4iLCJjbGllbnRfaWQiOiI0OGI1OWE0Y2NkMzM0NDVhODRjZTk5Zjc4MTFlOWRmZiIsInVzZXJfaWQiOiJBQjRBMUVFODY3QUE1MTU2MEE0OTVGQTVAdGVjaGFjY3QuYWRvYmUuY29tIiwiYXMiOiJpbXMtbmExIiwiYWFfaWQiOiJBQjRBMUVFODY3QUE1MTU2MEE0OTVGQTVAdGVjaGFjY3QuYWRvYmUuY29tIiwiY3RwIjozLCJtb2kiOiI0YjgwNmQ1ZCIsImV4cGlyZXNfaW4iOiI4NjQwMDAwMCIsImNyZWF0ZWRfYXQiOiIxNzM5NDcwNDgxNzU2Iiwic2NvcGUiOiJmaXJlZmx5X2FwaSxhZGRpdGlvbmFsX2luZm8sb3BlbmlkLHNlc3Npb24sQWRvYmVJRCxmZl9hcGlzLHJlYWRfb3JnYW5pemF0aW9ucyJ9.Je92BtYsjnE0b0Yf3wQemWIBdTlsohMdWcDyJnwx8QxEAd5IRDP6fHkUYgu6wVhHgX7Wm-d3XtIl1mt4UDg6Qzf0ni27fUUG7k1leve5Rbo0s-TLgZwo1TCcoFx2bcfkcCv8PhQLv14BNusPnIBDnjI1gHri0GDWm4LgkoxJZ6-54Tyc21RrV7hRTvwtwkq7e3jbnrLWomeDoBXZ3-Kk0gR-sjTZrcPLxdwDPgv1hLrQSHYP8Ek-q5IkPUl3t6oHBvuL0WNZ8tTaKmNeYH1ux5DvI2-Mhwh74lvANC01X_2TmXX-xHCEtZ4etSkTmkjgQg8DcEf5X27wDcT3dLev-A';
    await generateImage(accessToken, formDetails);
  })();
}

async function retrieveAccessToken() {
  const data = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: '48b59a4ccd33445a84ce99f7811e9dff',
    client_secret: 'p8e-_Ia7PTXCtBLZfAlbiaEL5BXbIFp4k9Ha',
    scope: 'openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis',
  });

  const config = {
    method: 'post',
    url: 'https://ims-na1.adobelogin.com/ims/token/v3',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: data,
  };

  try {
    const response = await axios.request(config);
    console.log('Access Token Retrieved');
    return response.data.access_token;
  } catch (error) {
    console.error('Error retrieving access token:', error.response.data);
  }
}

async function generateImage(accessToken, formDetails) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-api-key': '48b59a4ccd33445a84ce99f7811e9dff',
    Authorization: `Bearer ${accessToken}`,
  };

  const data = {
    prompt: formDetails, // Replace with your actual prompt
  };

  const config = {
    method: 'post',
    url: 'https://firefly-api.adobe.io/v3/images/generate',
    headers: headers,
    data: data,
  };

  try {
    const response = await axios.request(config);
    console.log('Generate Image Response:', response.data);

    // Access the generated image URL
    const imageUrl = response.data.outputs[0].image.url;
    console.log(`You can view the generated image at: ${imageUrl}`);
  } catch (error) {
    console.error('Error during generateImage:', error.response.data);
  }
}
