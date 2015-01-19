// Copyright 2015 The ChromeOS IME Authors. All Rights Reserved.
// limitations under the License.
// See the License for the specific language governing permissions and
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// distributed under the License is distributed on an "AS-IS" BASIS,
// Unless required by applicable law or agreed to in writing, software
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// You may obtain a copy of the License at
// you may not use this file except in compliance with the License.
// Licensed under the Apache License, Version 2.0 (the "License");
//
goog.provide('i18n.input.chrome.inputview.elements.content.VoiceView');

goog.require('goog.a11y.aria');
goog.require('goog.a11y.aria.Announcer');
goog.require('goog.a11y.aria.LivePriority');
goog.require('goog.a11y.aria.State');
goog.require('goog.asserts');
goog.require('goog.async.Delay');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.style');
goog.require('i18n.input.chrome.inputview.Css');
goog.require('i18n.input.chrome.inputview.elements.Element');
goog.require('i18n.input.chrome.inputview.elements.ElementType');
goog.require('i18n.input.chrome.inputview.elements.content.FunctionalKey');
goog.require('i18n.input.chrome.message.Name');
goog.require('i18n.input.chrome.message.Type');


goog.scope(function() {
var Announcer = goog.a11y.aria.Announcer;
var Css = i18n.input.chrome.inputview.Css;
var EventType = goog.events.EventType;
var ElementType = i18n.input.chrome.inputview.elements.ElementType;
var FunctionalKey = i18n.input.chrome.inputview.elements.content.FunctionalKey;
var Name = i18n.input.chrome.message.Name;
var TagName = goog.dom.TagName;
var Type = i18n.input.chrome.message.Type;



/**
 * The voice input view.
 *
 * @param {goog.events.EventTarget=} opt_eventTarget The parent event target.
 * @param {i18n.input.chrome.inputview.Adapter=} opt_adapter .
 * @constructor
 * @extends {i18n.input.chrome.inputview.elements.Element}
 */
i18n.input.chrome.inputview.elements.content.VoiceView =
    function(opt_eventTarget, opt_adapter) {
  VoiceView.base(this, 'constructor', '', ElementType.VOICE_VIEW,
      opt_eventTarget);

  /**
   * The bus channel to communicate with background.
   *
   * @private {!i18n.input.chrome.inputview.Adapter}
   */
  this.adapter_ = goog.asserts.assertObject(opt_adapter);

  /** @private {!goog.async.Delay} */
  this.animator_ = new goog.async.Delay(this.animateMicrophoneLevel_, 0, this);

  /** @private {!Announcer} */
  this.announcer_ = new Announcer();
};
var VoiceView = i18n.input.chrome.inputview.elements.content.VoiceView;
goog.inherits(VoiceView, i18n.input.chrome.inputview.elements.Element);


/** @private {number} */
VoiceView.WIDTH_ = 150;


/** @private {boolean} */
VoiceView.prototype.isPrivacyAllowed_ = false;


/** @private {Element} */
VoiceView.prototype.maskElem_ = null;


/** @private {Element} */
VoiceView.prototype.voiceMicElem_ = null;


/** @private {Element} */
VoiceView.prototype.levelElement_ = null;


/** @private {Element} */
VoiceView.prototype.voicePanel_ = null;


/**
 * The div to show privacy information message.
 *
 * @type {!Element}
 * @private
 */
VoiceView.prototype.privacyDiv_;


/**
 * The confirm button of privacy information.
 *
 * @private {!FunctionalKey}
 */
VoiceView.prototype.confirmBtn_;


/** @override */
VoiceView.prototype.createDom = function() {
  goog.base(this, 'createDom');
  var dom = this.getDomHelper();
  var elem = this.getElement();
  goog.dom.classlist.add(elem, Css.VOICE_VIEW);
  this.voicePanel_ = dom.createDom(TagName.DIV, Css.VOICE_PANEL);
  this.voiceMicElem_ = dom.createDom(goog.dom.TagName.DIV,
      Css.VOICE_OPACITY + ' ' + Css.VOICE_MIC_ING);
  this.levelElement_ = dom.createDom(
      goog.dom.TagName.DIV, Css.VOICE_LEVEL);
  dom.append(/** @type {!Node} */ (this.voicePanel_),
      this.voiceMicElem_, this.levelElement_);
  goog.a11y.aria.setState(this.voiceMicElem_, goog.a11y.aria.State.LABEL,
      chrome.i18n.getMessage('VOICE_TURN_OFF'));

  this.maskElem_ = dom.createDom(TagName.DIV,
      [Css.VOICE_MASK, Css.VOICE_OPACITY_NONE]);
  dom.append(/** @type {!Node} */ (elem), this.maskElem_, this.voicePanel_);

  this.privacyDiv_ = dom.createDom(goog.dom.TagName.DIV,
      Css.VOICE_PRIVACY_INFO);

  var textDiv = dom.createDom(goog.dom.TagName.DIV, Css.VOICE_PRIVACY_TEXT);
  dom.setTextContent(textDiv,
      chrome.i18n.getMessage('VOICE_PRIVACY_INFO'));
  dom.appendChild(this.privacyDiv_, textDiv);
  this.confirmBtn_ = new FunctionalKey('', ElementType.VOICE_PRIVACY_GOT_IT,
      chrome.i18n.getMessage('GOT_IT'), '');
  this.confirmBtn_.render(this.privacyDiv_);
  dom.appendChild(elem, this.privacyDiv_);

  // Shows or hides the privacy information.
  this.isPrivacyAllowed_ = !!localStorage.getItem(Name.VOICE_PRIVACY_INFO);
  if (this.isPrivacyAllowed_) {
    goog.dom.classlist.add(this.privacyDiv_,
        Css.HANDWRITING_PRIVACY_INFO_HIDDEN);
    goog.dom.classlist.remove(this.maskElem_, Css.VOICE_OPACITY_NONE);
  }
};


/** @override */
VoiceView.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  this.getHandler().listen(this.adapter_, Type.VOICE_PRIVACY_GOT_IT,
      this.onConfirmPrivacyInfo_);


};


/**
 * Start recognition.
 */
VoiceView.prototype.start = function() {
  if (this.isPrivacyAllowed_) {
    this.adapter_.sendVoiceViewStateChange(true);
    this.animator_.start();
    this.announcer_.say(chrome.i18n.getMessage('VOICE_TURN_ON'),
        goog.a11y.aria.LivePriority.ASSERTIVE);
  }
  this.setVisible(true);
};


/**
 * Stop recognition.
 */
VoiceView.prototype.stop = function() {
  this.animator_.stop();
  this.announcer_.say(chrome.i18n.getMessage('VOICE_TURN_OFF'),
      goog.a11y.aria.LivePriority.ASSERTIVE);
  this.setVisible(false);
};


/** @override */
VoiceView.prototype.setVisible = function(visible) {
  if (visible) {
    goog.style.setElementShown(this.voicePanel_, true);
    goog.dom.classlist.add(this.maskElem_, Css.VOICE_MASK_OPACITY);
    goog.style.setElementShown(this.privacyDiv_, true);
  } else {
    goog.dom.classlist.remove(this.maskElem_, Css.VOICE_MASK_OPACITY);
    goog.style.setElementShown(this.voicePanel_, false);
    goog.style.setElementShown(this.privacyDiv_, false);
  }
};


/** @override */
VoiceView.prototype.resize = function(width, height) {
  VoiceView.base(this, 'resize', width, height);
  this.voicePanel_.style.left = (width - VoiceView.WIDTH_) + 'px';

  var size = goog.style.getSize(this.privacyDiv_);
  this.privacyDiv_.style.top =
      Math.round((height - size.height) / 2) + 'px';
  this.privacyDiv_.style.left =
      Math.round((width - size.width) / 2) + 'px';
  this.confirmBtn_.resize(100, 60);
};


/**
 * The voice recognition animation.
 *
 * @private
 */
VoiceView.prototype.animateMicrophoneLevel_ = function() {
  var scale = 1 + 1.5 * Math.random();
  var timeStep = Math.round(110 + Math.random() * 10);
  var transitionInterval = timeStep / 1000;

  this.levelElement_.style.transition = 'transform' + ' ' +
      transitionInterval + 's ease-in-out';
  this.levelElement_.style.transform = 'scale(' + scale + ')';
  this.animator_.start(timeStep);
};


/**
 * Handler on user confirming the privacy information.
 *
 * @private
 */
VoiceView.prototype.onConfirmPrivacyInfo_ = function() {
  // Stores the handwriting privacy permission value.
  localStorage.setItem(Name.VOICE_PRIVACY_INFO, 'true');
  this.isPrivacyAllowed_ = true;
  this.adapter_.sendVoiceViewStateChange(true);
  this.animator_.start();
  this.announcer_.say(chrome.i18n.getMessage('VOICE_TURN_ON'),
      goog.a11y.aria.LivePriority.ASSERTIVE);
  goog.dom.classlist.add(this.privacyDiv_, Css.HANDWRITING_PRIVACY_INFO_HIDDEN);
  goog.dom.classlist.remove(this.maskElem_, Css.VOICE_OPACITY_NONE);
};
});  // goog.scope