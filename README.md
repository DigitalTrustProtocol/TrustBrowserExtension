[![Gitter](https://badges.gitter.im/DigitalTrustProtocol/FakeNewsApp.svg)](https://gitter.im/DigitalTrustProtocol/FakeNewsApp?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

# Anti Fake News Browser Extension

## Introduction
It is a decentralized trust and reputation system used on peers and webpages. The idea is to build up your own trusted network that you can leverage on for information about subjects and websites.

Using other products to give reviews and ratings about subjects on the internet has the problem that anyone can post a review comment. You will never be able to know if it is a genuine person behind or a paid troll.
With AFN, you only rely on your personal trusted network, and therefore, you can trust the reviews and comments that you see in the Extension.

## Concept

Fake news and AI generated content are a massive problem as there usually is no quick way to fact check the content and source.
Fake news is usually founded in a real source of information but is distorted to fit a narrative. With the never-ending flow of information available on the internet, fact-checking everything is near impossible for a single person to handle.
Even professionals like journalists that are paid to do their fact checking are usually incentive to produce a lot of content and therefore just relay information that seems to be correct without fact checking it first. There is simply no time to fact-check when you need to be the first one to break the news.

How to combat fake news?

There is no good centralized solution, sorry. Here is why…
All information relayed from a person is always presented in a subjective way. Therefore reporting becomes an interpretation of the events happening. There are always degrees of truthiness in the interpretation, but that is defined by the receiver of the information.

Of cause, it would be possible to record everything, to get a full picture of context around the event and present this as information, but you still have the interpretation of the receiver. Recording everything is not efficient and is very time-consuming, so we fall back to reporting and subjective interpretation from the reporter.

Big social platforms are trying hard to govern the information on their platforms, therefore they set up rules that are used to filter information. The problem is that the rules are objective and not subjective, and to comply with the laws of many counties in general, the rules usually ends up stricter than any one country laws.
So fact-checking information before relaying it is an interpretation of an intermediary that decides if the information is valid or not. This may not fit with the end receiver view of things.

Today most consumers of information have to rely on the good faith on the producer of information, as the time and effort to validate the information oneself is not worth the effort. This creates an environment where it is easy to produce information that heavily manipulated and very little fact-checked before it reaches the masses.

What is needed is a system that can immediately present the fact-checking of information in a context according to one’s subjective perspective. This requires a system that supports the possibility of subjective trust in a peer to peer way, resulting in a web of trust network. This way, the only information that is trusted within one’s network will be relayed or flagged. This is similar to white listing intermediaries that we trust. 

## How to use
[Introducing Anti Fake News](https://medium.com/@carstenkeutmann_96497/introducing-anti-fake-news-4a50cf273e6d)


### Setup

** To install necessary dependency run 

npm install

**  To build  project run

npm run build

**  To run in development mode for watch and build

npm run dev

#Chorme Browser install
A client interface for issuing Trust on Twitter

Install:

1. Clone the project locally or download a zip package.
2. Open Chrome browser and go to Extensions (write in url: chrome://extensions/)
3. Enable "Developer mode"
4. Select "Load unpacked" and navigate and select the project folder.
5. Open twitter
6. A DTP icon appears on the upper right corner of the browser. Click the icon.
7. Add your password and seed, press save.

