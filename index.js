const webdriver = require('selenium-webdriver');
const promise = require('selenium-webdriver').promise;
const until = webdriver.until;
const signin_data = require('./auth/amazon_cred');
const db = require('./db');

const driver = new webdriver.Builder().
	withCapabilities(webdriver.Capabilities.chrome()).
	build();

function navigateToAlexaSkills(driver, callback) {
	driver.get('http://alexa.amazon.co.uk/');
	driver.findElement(webdriver.By.name('email')).sendKeys(signin_data.username).then(() => {
		driver.findElement(webdriver.By.name('password')).sendKeys(signin_data.password).then(() => {
			driver.findElement(webdriver.By.id('signInSubmit')).click().then(() => {
				let apps = webdriver.By.id('iApps');
				driver.wait(until.elementLocated(apps)).then(() => {
					driver.sleep(1000).then(() => {

						driver.wait(until.elementIsVisible(driver.findElement(apps))).then(() => {
							driver.wait(until.elementIsEnabled(driver.findElement(apps))).then(() => {
								driver.findElement(webdriver.By.id('iApps')).click().then(() => {
									driver.wait(until.elementLocated(webdriver.By.id('a2s-search-input', 10000))).then(() => {
										driver.wait(until.elementIsVisible(driver.findElement(webdriver.By.id('a2s-search-input', 10000)))).then(() => {
											callback(driver);
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
}


function performSearch(driver, text, callback) {
	driver.findElement(webdriver.By.id('a2s-search-input')).sendKeys(text).then(() => {
		driver.findElement(webdriver.By.css('#a2s-search-form > div.a2s-text-bar-right > div')).click().then(() => {
			driver.wait(until.elementLocated(webdriver.By.css('#a2s-search-form > div.a2s-text-bar-right > div'))).then(() => {
				driver.wait(until.elementIsVisible(driver.findElement(webdriver.By.css('#a2s-search-form > div.a2s-text-bar-right > div')))).then(() => {
					callback(driver);
				});
			});
		});
	});

}

function foreachListElement(driver, elems) {
	let result = promise.fullyResolved();
	for (let i = 0; i < elems.length; ++i) {
		result = result.then(() => { parseSearchResult(driver, elems[i]); });
	}
	result.then(() => {
		console.log("Done");
	});
}

function search(driver, i, length) {
	let search_str = '#d-content > div > div > div.a2s-content-region > div > div > div > div.a2s-list-region > ul > li';
	return driver.findElements(webdriver.By.css(search_str)).then((elems) => {
						console.log("length: " + length + ", elem.length: " + elems.length);
						if (length < elems.length) { console.log("length was " + length + ", is now " + elems.length); length = elems.length; }
						if(elems.length < i)
							return search(driver, i, length);
						if(i < length) {
							let result = parseSearchResult(driver, elems[i])
							if(result)	
								return result.then(() => {
							i = i + 1;
							if(i < length) {
								return search(driver, i, length);
							}
							return i;
							});
							else
								return search(driver, i, length);
						}
						else 
							return i;
	});

}
function foreachSearchResult(driver, callback) {
	driver.wait(until.elementIsNotVisible(driver.findElement(webdriver.By.className('a2s-loading-view')))).then(() => {
		driver.findElements(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > div.a2s-list-region > ul > li')).then((elems) => {
			//		let pendinghtml = elems.map((elem) => { return parseSearchResult(driver, elem); });
			//foreachListElement(driver, elems);
			let length = elems.length;
			let i = 0;
/*			let result = promise.fullyResolved(i);
			let search_str = '#d-content > div > div > div.a2s-content-region > div > div > div > div.a2s-list-region > ul > li';
			for (; i < length; ++i) {
				console.log(i);
				result = result.then((i) => {
					driver.findElements(webdriver.By.css(search_str)).then((elems) => {
						console.log("length: " + length + ", elem.length: " + elems.length);
						if (length < elems.length) { console.log("length was " + length + ", is now " + elems.length); length = elems.length; }
						if(i < length)
							return parseSearchResult(driver, elems[i]).then(() => {return i + 1});
					})
				});
			}*/
			search(driver, i, length).then(() => {
				console.log("Done");
			});
		});
	});
}

function aggregateReviews(driver) {
	return driver.findElements(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > section.skill-reviews-region > div > ul > div > div.text-component.mode-sub-section.type-navigation.type-secondary > h4')).then((elems) => {
															if (elems.length != 0) {
																return driver.wait(until.elementIsVisible(driver.findElement(webdriver.By.css('div.a2s-content-region > div > div > div > section.skill-reviews-region > div > ul > div > div.text-component.mode-sub-section.type-navigation.type-secondary > h4')))).then(() => {
																	return elems[0].click().then(() => {
																		return driver.findElements(webdriver.By.css('div.a2s-list-region > ul > li > section')).then((elements) => {
																			let reviews = elements.map((item) => {
																			    item.getAttribute('innerHTML').then((text) => console.log(text));
																				return item.findElement(webdriver.By.css('div.a2s-star-rating-region > div')).then((scoreitem) => {
																					//scoreitem.getAttribute('innerHTML').then((text) => console.log(text));
																					return scoreitem.getAttribute('aria-label').then((score) => {
																						return item.findElement(webdriver.By.css('div.a2s-review-text-region > div > p')).then((reviewtext) => {
																							reviewtext.getText().then((reveiw_text) => {
																								console.log("Storing review " + skillname + ", " + score + ", " + reveiw_text);
																								db.storereview(skillname, score, reviewtext);
																							});
																						});
																					});
																				});
																			});
																			return promise.all(reviews).then(() => {
																				driver.navigate().back().then(() => {
																					driver.navigate().back();
																				});
																			});
																		});
																	});
																});
															}
															else {
																return driver.findElements(webdriver.By.css('#a2s-no-reviews-yet')).then((anyreviews) => {
																	if(anyreviews.length != 0) {
																		anyreviews[0].getAttribute('innerHTML').then((text) => console.log(text));
																		console.log("No Reviews found");
																		return driver.navigate().back()
																	} else return aggregateReviews(driver);
																})
															}
														}, (err) => { console.log("No Reviews exist " + err) });
}

function parseSearchResult(driver, elem) {
	if (elem) {
		return driver.wait(until.elementIsNotVisible(driver.findElement(webdriver.By.className('a2s-loading-view')))).then(() => {
			elem.findElement(webdriver.By.className('skill-name')).click().then(() => {

				return driver.wait(until.elementLocated(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > div > section.skill-detail-header > section > div.skill-info > h2'))).then(() => {
					return driver.wait(until.elementIsVisible(driver.findElement(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > div > section.skill-detail-header > section > div.skill-info > h2')))).then(() => {
						return driver.findElement(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > div > section.skill-detail-header > section > div.skill-info > h2')).then((textitem) => {
							return textitem.getText().then((skillname) => {
								db.haveseenskill(skillname, (seen) => {
									if (!seen) {
										return driver.findElement(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > section.skill-info-region > div > ul > div > div.text-component.mode-sub-section > p')).then((descitem) => {
											return descitem.getText().then((description) => {
												db.storeskill(skillname, description);
												return driver.findElements(webdriver.By.css('#d-content > div > div > div.a2s-content-region > div > div > div > section.skill-sample-utterances > div > ul > li')).then((phraseitems) => {
													return promise.all(phraseitems.map((phraseelem) => {
														return phraseelem.getText().then((phrase) => {
															db.storephrase(skillname, phrase);
														});
													})).then(() => {
														return aggregateReviews(driver);
													});
												});
											})
										});
									}

									else return driver.navigate().back()
								});
							});
						});
					});
				});
			});
		});
	} else
		return undefined;
}

navigateToAlexaSkills(driver, (driver) => {
	performSearch(driver, "smoking", (driver) => {
		foreachSearchResult(driver);
	});
});

