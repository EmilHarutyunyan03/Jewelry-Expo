const MainRingBuilderStorageKey = 'shop_ring_settings_v3';
const FrontAccessToken = 'b8cde1699fbf2063dd74c2984da2b57e';
const storageKey = 'try_on_selection';

window.__evosem_ssurl = "https://diamonds-app.evosem.com";

Shopify.formatMoney = function(cents, format = '${{amount}}') {
	
	if (typeof cents == 'string') cents = cents.replace('.','');
	
	let value = '',
	placeholderRegex = /\{\{\s*(\w+)\s*\}\}/,
	formatString = (format || this.money_format);

	const defaultOption = (opt, def) => (typeof opt == 'undefined' ? def : opt);

	const formatWithDelimiters = (number, precision, thousands, decimal) => {
		precision = defaultOption(precision, 2);
		thousands = defaultOption(thousands, ',');
		decimal   = defaultOption(decimal, '.');

		if (isNaN(number) || number == null) return 0;

		number = (number/100.0).toFixed(precision);

		let parts   = number.split('.'),
		    dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
		    cents   = parts[1] ? (decimal + parts[1]) : '';

		return dollars + cents;
	}

	switch(formatString.match(placeholderRegex)[1]) {
		case 'amount':
			value = formatWithDelimiters(cents, 2);
		break;
		case 'amount_no_decimals':
			value = formatWithDelimiters(cents, 0);
		break;
		case 'amount_with_comma_separator':
			value = formatWithDelimiters(cents, 2, '.', ',');
		break;
		case 'amount_no_decimals_with_comma_separator':
			value = formatWithDelimiters(cents, 0, '.', ',');
		break;
	}

	return formatString.replace(placeholderRegex, value).replace('.00',''); //Remove unnecessary decimal format 
}


document.addEventListener('DOMContentLoaded', (function(){

    (() => {

		if(document.getElementById('MainRingBuilder')){
			const MainRingBuilder = new Vue({
				delimiters: ['[[', ']]'],
				el: '#MainRingBuilder',
				data: {
                    diamondsShapes: window.diamondsShapes,
                    visibleMobile: false,
					is_product_page: false,
					is_collection_page: false,
					is_diamondsearch_page: false,
					is_ringbuilder_page: false,
					selectedRing: null,
					selectedDiamond: null,
					selectedRingBuildSettings: null,
				},
				created: function() {
                    console.log('Vue: component created')
				},
				mounted(){
					try {
						this.is_product_page = (
							_rb_is_available && 
							_rb_product && 
							!_rb_product_collections.map( collection => collection?.handle).includes('rose-cut-engagement-rings') && 
							_rb_product_collections.filter( collection => (collection?.handle === 'engagement-rings' || collection?.handle === 'build-an-engagement-ring') && collection?.handle !== 'rose-cut-engagement-rings' ).length > 0 // if the product is in the collection engagement rings.
						);

						this.is_collection_page = (_rb_is_available && _rb_current_collection && (_rb_current_collection.handle === 'engagement-rings' || _rb_current_collection.handle === 'build-an-engagement-ring' || _rb_current_collection?.metafields?.enable_ring_builder) );
						this.is_diamondsearch_page = _rb_is_diamondsearch_page;
						this.is_ringbuilder_page = _rb_is_ringbuilder_page;
	
						if(this.is_product_page && document.querySelector('.product-form__quantity')) {
							document.querySelector('.product-form__quantity').style.display = 'none'
						}
	
						this.loadRingSettings();
						this.listenOnLocalChanges();
					} catch (error) {
						console.log(error)
					}
				},
				methods: {

					clearSettings(){

						try {

							//Save to localstorage								
							const setItemObjection = localStorage.setItem;
							localStorage.setItem = function(key, value) {
								const event = new Event('ringbuilderstoragechange');
								event.value = value;
								event.key = key;
								document.dispatchEvent(event);
								setItemObjection.apply(this, arguments);
							};
							localStorage.setItem(MainRingBuilderStorageKey, '');
							return document.createEvent('Event').initEvent('ringbuilderstoragechange', true, true);


						} catch ( error ) {
							return console.warn(error);
						}
					},

                    toggleMobileView() {
                        this.visibleMobile = !this.visibleMobile;
                    },

					listenOnLocalChanges() {
						document.addEventListener('ringbuilderstoragechange', $event => {
							setTimeout(this.loadRingSettings, 500);
						}, false);
					},

					loadRingSettings() {
						try {
							const ringBuilderData = this.getBuilderLocalStorageSettings();
							if(ringBuilderData && ringBuilderData.ring && ringBuilderData.ring.variant && ringBuilderData.ring.product) {
								const _selectedRingVariant = ringBuilderData.ring.product.variants.filter( variant =>  variant.id === ringBuilderData.ring.variant).reduce( t => t);
								this.selectedRing = {
									ringsize: ringBuilderData.ring.ringsize,
									variant: _selectedRingVariant,
									price: _selectedRingVariant.price,
									priceFormatted: Shopify.formatMoney(_selectedRingVariant.price, '${{amount}}'),
									product: ringBuilderData.ring.product,
									productImageSmall: ringBuilderData.ring.product.media[0].preview_image.src + '&width=200',
								}

							}

							if(ringBuilderData && ringBuilderData.diamond && ringBuilderData.diamond.carat && ringBuilderData.diamond.shape) {
								this.selectedDiamond = ringBuilderData.diamond;
							}

							if(!_.isEmpty(this.selectedDiamond) && !_.isEmpty(this.selectedRing)) {
								this.selectedRingBuildSettings = {
									total: Shopify.formatMoney((this.selectedRing.price + this.selectedDiamond.priceNumber), '${{amount}}'),
								}
							}

						} catch (error) {
							console.log(error);
						}
					},

					getBuilderLocalStorageSettings() {

						const shop_ring_settings = localStorage.getItem(MainRingBuilderStorageKey);
						try {
							return JSON.parse(shop_ring_settings);
						} catch ( error ) {
							return false;
						}

					},
				}
			});

		}

        if(document.getElementById('MainRingBuilderBtn')){
			const MainRingBuilderButton = new Vue({
				delimiters: ['[[', ']]'],
				el: '#MainRingBuilderBtn',
				data: {
					selectedRing: null,
					selectedDiamond: null,
					is_product_page: false,
				},
				created: function() {

				},
				mounted(){

					this.is_product_page = (
						_rb_is_available && 
						_rb_product && 
						_rb_product_collections.filter( collection => collection.handle === 'engagement-rings').length > 0 // if the product is in the collection engagement rings.
					);

					const builderLocalStorage = this.getBuilderLocalStorageSettings();
					if(builderLocalStorage && !_.isEmpty(builderLocalStorage.diamond)) this.selectedDiamond = builderLocalStorage.diamond;

				},

				methods: {

					async addRingToBuilder($event) {
						
                        const setRing = await this.setRingLocalStorageSettings();
						if(!setRing) return;

						if(_.isEmpty(this.selectedDiamond)) return window.location.replace('/pages/diamondsearch');

						return window.location.replace('/pages/ringbuilder');
					},

					getBuilderLocalStorageSettings() {

						const shop_ring_settings = localStorage.getItem(MainRingBuilderStorageKey);
						try {
							return JSON.parse(shop_ring_settings);
						} catch ( error ) {
							return false;
						}

					},

					async setRingLocalStorageSettings() {

						try {

							const shop_ring_settings = this.getBuilderLocalStorageSettings(),
							selectedVariation = Number(document.querySelector('input[name="id"]').value),
							selectedRingSize = document.querySelector('.ring-size-selector.ring-size') ? document.querySelector('.ring-size-selector.ring-size').value : null,
							selectedRing = {
								product: _rb_product,
								variant: selectedVariation,
								ringsize: selectedRingSize,
							}

							if(_.isEmpty(selectedRingSize)) {
								window.alert('Please select ring size');
								return false;
							}

							let _shop_ring_settings = shop_ring_settings

							if(!_shop_ring_settings || typeof _shop_ring_settings !== 'object') {
								_shop_ring_settings = {};
							}

							_shop_ring_settings.ring = selectedRing;

							//Save to localstorage								
							const setItemObjection = localStorage.setItem;
							localStorage.setItem = function(key, value) {
								const event = new Event('ringbuilderstoragechange');
								event.value = value;
								event.key = key;
								document.dispatchEvent(event);
								setItemObjection.apply(this, arguments);
							};
							localStorage.setItem(MainRingBuilderStorageKey, JSON.stringify(_shop_ring_settings));
							document.createEvent('Event').initEvent('ringbuilderstoragechange', true, true);
							return true;

						} catch ( error ) {
							
							console.warn(error);
							return false;

						}

					}

				}
			});
        }


		if(document.getElementById('MainRingBuilerPageReview')) {

			const MainRingBuilerPageReview = new Vue({
				delimiters: ['[[', ']]'],
				el: '#MainRingBuilerPageReview',
				data: {
					ready: false,
					diamondExist: true,
					addingToCart: false,
					selectedRing: null,
					selectedDiamond: null,
					selectedRingBuildSettings: null,
					selectedRingFeaturedImage: null,
					selectedRingRealProduct: null,
					visibleRingSizesDropdown: false,
				},
				created: function() {

				},
				updated() {

				},
				mounted(){
					this.loadRingSettings();
					this.listenOnLocalChanges();
					this.getProductFeaturedImage();
					this.getRealProductData();
				},
				methods: {

					addToCart( $event ) {

						if(this.addingToCart) return;

						this.addingToCart = true;

						fetch('https://partners.fancylab.com/barclaysjewelry/api/create-product.php', {
							method: 'POST',
							mode: 'cors',
							cache: 'no-cache',
							credentials: 'same-origin',
							body:JSON.stringify({
								stock_number: this.selectedDiamond?.sku,
								ring_variant: this.selectedRing?.variant?.id,
								ring_size: this.selectedRing.ringsize,
							})
						}).then( response => response.json())
						.then ( response => {

							try {

								if(!response.status) {
									this.addingToCart = false;
									return window.alert(response.error);
								}

								if(!response?.shopifyCreate?.data?.productCreate?.product?.variants) {
									this.addingToCart = false;
									return window.alert('Something went wrong please try again later.');
								}

								const variantId = response?.shopifyCreate?.data?.productCreate?.product?.variants.edges[0].node.legacyResourceId;

                                //once we get the diamond (variant) id we send it to shopify add to cart REST api along with the ring variation.
								fetch('/cart/add.js', {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json'
									},
									body: JSON.stringify({
										items: [{
											id: this.selectedRing?.variant?.id,
											quantity: 1,
											properties: {
												'Diamond SKU': this.selectedDiamond.sku,
                                                'Ring Size': this.selectedRing.ringsize,
											},
										},{
											id: variantId,
											quantity: 1,
											properties: {
												'SKU': this.selectedDiamond.sku,
												'Cut': this.selectedDiamond.cut,
												'Color': this.selectedDiamond.color,
												'Clarity': this.selectedDiamond.clarity,
												'Lab': this.selectedDiamond.type,
												'Ring': this.selectedRing.variant.sku,
                                                'Certificate': [this.selectedDiamond.laboratory, this.selectedDiamond.certificate].join(' - ')
											},
										}]
									})
								}).then( response => response.json())
								.then( response => {
									this.addingToCart = false;
                                    this.clearRingLocalStorageSettings()
									return window.location.replace('/cart');
								}).catch( error => {
									console.log(error);
									this.addingToCart = false;
									return window.alert('Something went wrong please try again later.');
								})


							} catch ( error ) {
								console.log(error);
								this.addingToCart = false;
								return window.alert('Something went wrong please try again later.');
							}

						})
						.catch( error => {
							this.addingToCart = false;
							console.log(error);
						})
					},

					toggleRingSizeDropDown($event) {
						this.visibleRingSizesDropdown = !this.visibleRingSizesDropdown;
					},

					pickRingSize(value) {
						//Hide the options dropdown.
						this.visibleRingSizesDropdown = false;
						try {
							const selectedVariation = _.head(this.selectedRingRealProduct?.variants?.edges.filter( variant => variant.node.title === value));
							//Because the variation from the API is different must compromise the formatting
							this.selectedRing.variant = {
								id: parseInt(selectedVariation.node.id.replace('gid://shopify/ProductVariant/','')),
								title: selectedVariation.node.title,
								option1: selectedVariation.node.title,
								option2: null,
								option3: null,
								sku: selectedVariation.node.sku,
								requires_shipping: selectedVariation.node.requires_shipping,
								taxable: true,
								featured_image: null,
								available: selectedVariation.node.available,
								name: `${this.selectedRing.product.title} ${selectedVariation.node.title}`,
								public_title: selectedVariation.node.title,
								options: [ selectedVariation.node.title ],
								price: selectedVariation.node.price,
								weight: selectedVariation.node.weight,
								compare_at_price: null,
								inventory_management: "shopify",
								barcode: null
							}

							this.selectedRing.price = selectedVariation.node.price;
							this.selectedRing.priceFormatted = Shopify.formatMoney(selectedVariation.node.price, '${{amount}}');

							//Since this selected variant is different save it to the ring builder. easy!
							this.setRingLocalStorageSettings();
							this.loadRingSettings();

						} catch (error) {
							console.log(error);
						}
					},

					listenOnLocalChanges() {
						document.addEventListener('ringbuilderstoragechange', $event => {
							setTimeout(this.loadRingSettings, 500);
						}, false);
					},

					async loadRingSettings() {
						try {
							const ringBuilderData = this.getBuilderLocalStorageSettings();

							if(_.isNull(ringBuilderData)) return this.ready = true;

							if(ringBuilderData && ringBuilderData.ring && ringBuilderData.ring.variant && ringBuilderData.ring.product) {
								const _selectedRingVariant = ringBuilderData.ring.product.variants.filter( variant =>  variant.id === ringBuilderData.ring.variant).reduce( t => t);
								this.selectedRing = {
									ringsize: ringBuilderData.ring.ringsize,
									variant: _selectedRingVariant,
									price: _selectedRingVariant.price,
									priceFormatted: Shopify.formatMoney(_selectedRingVariant.price, '${{amount}}'),
									product: ringBuilderData.ring.product,
									productImageSmall: ringBuilderData.ring.product.media[0].preview_image.src + '&width=200',
								}

							}

							if(ringBuilderData && ringBuilderData.diamond && ringBuilderData.diamond.carat && ringBuilderData.diamond.shape) {
								this.selectedDiamond = ringBuilderData.diamond;
							}

							if(!_.isEmpty(this.selectedDiamond) && !_.isEmpty(this.selectedRing)) {
								this.selectedRingBuildSettings = {
									total: Shopify.formatMoney((this.selectedRing.price + this.selectedDiamond.priceNumber), '${{amount}}') +' '+ Shopify.currency.active,
								}

								this.getProductFeaturedImage();
								await this.checkOnDiamond()
								return this.ready = true;

							}

							return this.ready = true;


						} catch (error) {
							console.log(error);
						}
					},

					getBuilderLocalStorageSettings() {

						const shop_ring_settings = localStorage.getItem(MainRingBuilderStorageKey);
						try {
							return JSON.parse(shop_ring_settings);
						} catch ( error ) {
							return false;
						}
					},

					setRingLocalStorageSettings() {

						const shop_ring_settings = this.getBuilderLocalStorageSettings(),
						selectedRing = {
							product: this.selectedRing.product,
							variant: this.selectedRing.variant.id,
						}

						try {
							let _shop_ring_settings = shop_ring_settings

							if(!_shop_ring_settings || typeof _shop_ring_settings !== 'object') {
								_shop_ring_settings = {};
							}

							_shop_ring_settings.ring = selectedRing;

							//Save to localstorage								
							const setItemObjection = localStorage.setItem;
							localStorage.setItem = function(key, value) {
								const event = new Event('ringbuilderstoragechange');
								event.value = value;
								event.key = key;
								document.dispatchEvent(event);
								setItemObjection.apply(this, arguments);
							};
							localStorage.setItem(MainRingBuilderStorageKey, JSON.stringify(_shop_ring_settings));
							return document.createEvent('Event').initEvent('ringbuilderstoragechange', true, true);


						} catch ( error ) {
							return console.warn(error);
						}
					},

                    clearRingLocalStorageSettings(){
                        localStorage.setItem(MainRingBuilderStorageKey, '');
                    },

					getProductFeaturedImage() {
						try {
							if(!this.selectedRing?.product?.featured_image) return false;
							this.selectedRingFeaturedImage = this.selectedRing?.product?.featured_image;

						} catch ( error ) {
							console.log(error);
							return false;
						}
					},

					getRealProductData() {

						const query = `
								query ($handle: String!) {
									product(handle: $handle) {
										id
										title
										description(truncateAt: 200)
										descriptionHtml
										availableForSale
										createdAt
										updatedAt
										publishedAt
										handle
										onlineStoreUrl
										tags
										vendor
										productType
										totalInventory
										seo {
											description
											title
										}
										featuredImage { 
											id 
											height 
											width 
											altText 
											url(transform: { maxWidth: 300, maxHeight: 300 })  
										}
										priceRange {
											maxVariantPrice {
												amount
												currencyCode
											}
											minVariantPrice {
												amount
												currencyCode
											}
										}
										collections(first: 10) {
											edges {
												cursor
												node {
													id
													description(truncateAt: 200)
													descriptionHtml
													handle
													onlineStoreUrl
													title
													updatedAt
												}
											}
										}
										variants(first: 250) {
											edges {
												node {
													id
													available: availableForSale
													barcode
													currentlyNotInStock
													# compare_at_price: compareAtPrice
													featured_image: image {
														url
													}
													quantityAvailable
													requires_shipping: requiresShipping
													sku
													title
													public_title: title
													weight
													selectedOptions {
														name
														value
													}
													# price
													priceV2 {
														amount
														currencyCode
													}
													unitPrice {
														amount
														currencyCode
													}
												}
											}
										}
										options(first: 250) {
											id
											name
											values
										}
									}
								}

						`;

						const variables = {
							handle: this.selectedRing?.product?.handle
						}

						fetch('https://barclaysjewelry.myshopify.com/api/2022-07/graphql.json', {
							method: 'POST',
							headers: {
								'X-Shopify-Storefront-Access-Token': FrontAccessToken,
								'Content-Type': 'application/json',
							},
							body:JSON.stringify({
								query: query,
								variables: variables
							})
						}).then( response => response.json())
						.then(response => {
							if(response?.data?.product) {
								this.selectedRingRealProduct = response?.data?.product;
                                console.log(this.selectedRingRealProduct)
								this.selectedRingRealProduct.Material = _.head(this.selectedRingRealProduct?.options.filter( option => option.name === 'Material'));
							}
						})
						.catch( error => console.log(error));
					},

					checkOnDiamond() {

                        fetch(`${window.__evosem_ssurl}/diamond-search/query`, {
                            method: "POST",
                            mode: "cors",
                            cache: "no-cache",
                            credentials: "same-origin",
                            headers: {
                                "X-Shopify-Shop": Shopify.shop,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                skusearch: this.selectedDiamond.sku
                            })
                        })
                        .then(response => response.json())
                        .then(response => {

                            if (_.isEmpty(response.diamonds)) {
								this.diamondExist = false;
								window.alert('Oups this diamond is no longer available');
								return diamond;
							}
                        })
                        .catch(error => {
                            console.warn(error)
                        });

					}
				}
			});
		}

    })();

})(), false);

window.addEventListener("load", () => {
    if (document.getElementById("evosem-diamond-search")) {
        window.currentCurrencySymbol = "$", 
        window.__evosemMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"], 
        window.diamondsLabs = ["GCAL", "GIA", "IGI", ], 
        window.diamondsColours = ["J", "I", "H", "G", "F", "E", "D"], 
        window.diamondsClarity = ["SI2", "SI1", "VS2", "VS1", "VVS2", "VVS1", "IF", "FL"], 
        window.diamondsCut = [{
            label: "none",
            value: "NONE"
        }, {
            label: "fair",
            value: "F"
        }, {
            label: "good",
            value: "GD"
        }, {
            label: "very good",
            value: "VG"
        }, {
            label: "excellent",
            value: "EX"
        }, {
            label: "ideal",
            value: "ID"
        }], 
        window.diamondsPolish = [{
            label: "none",
            value: "NONE"
        }, {
            label: "fair",
            value: "F"
        }, {
            label: "good",
            value: "GD"
        }, {
            label: "very good",
            value: "VG"
        }, {
            label: "excellent",
            value: "EX"
        }, {
            label: "ideal",
            value: "ID"
        }], 
        window.diamondsSymmetry = [{
            label: "none",
            value: "NONE"
        }, {
            label: "fair",
            value: "F"
        }, {
            label: "good",
            value: "GD"
        }, {
            label: "very good",
            value: "VG"
        }, {
            label: "excellent",
            value: "EX"
        }, {
            label: "ideal",
            value: "ID"
        }], 
        window.diamondsShapes = [{
            label: "round",
            value: "RD"
        }, {
            label: "oval",
            value: "OV"
        }, {
            label: "cushion",
            value: "CU"
        }, {
            label: "princess",
            value: "PR"
        }, {
            label: "emerald",
            value: "EM"
        }, {
            label: "pear",
            value: "PS"
        }, {
            label: "marquise",
            value: "MQ"
        }, {
            label: "asscher",
            value: "AS"
        }, {
            label: "radiant",
            value: "RT"
        }, {
            label: "heart",
            value: "HRT"
        }], 
        window.__shapes = [{
            label: "round",
            value: "RD"
        }, {
            label: "princess",
            value: "PR"
        }, {
            label: "emerald",
            value: "EM"
        }, {
            label: "asscher",
            value: "AS"
        }, {
            label: "marquise",
            value: "MQ"
        }, {
            label: "oval",
            value: "OV"
        }, {
            label: "square radiant",
            value: "SQRT"
        }, {
            label: "radiant",
            value: "RT"
        }, {
            label: "pear",
            value: "PS"
        }, {
            label: "heart",
            value: "HRT"
        }, {
            label: "cushion",
            value: "CU"
        }, {
            label: "triangle",
            value: "TA"
        }, {
            label: "trilliant",
            value: "TR"
        }], 
        window.__price = {
            min: 10,
            max: 3e6
        }, 
        window.__carat = {
            min: .08,
            max: 8.75
        }, 
        window.storedParams = {
            price: __price,
            carat: __carat,
            shapes: diamondsShapes,
            __shapes: __shapes,
            colours: diamondsColours,
            clarity: diamondsClarity,
            cut: diamondsCut,
            polish: diamondsPolish,
            symmetry: diamondsSymmetry
        };
        let e = e => e <= 0 ? "Call for price" : wNumb({
            thousand: ",",
            mark: ".",
            decimals: 3,
            prefix: currentCurrencySymbol
        }).to(e);
        window.__formatPrice = e;
        let a = new Vue({
            delimiters: ["$[", "]"],
            el: "#evosem-diamond-search",
            data: {
                dropHintMessageText: "",
                friendEmailMessageText: "",
                viewingMessageText: "",
                requerstMessageText: "",
                sendingDropHint: !1,
                sendingFriendEmail: !1,
                sendingScheduleRequest: !1,
                sendingRequestMore: !1,
                popboxes: {
                    drophint: !1,
                    moreinfo: !1,
                    emailfriend: !1,
                    scheduleview: !1
                },
                copied: !1,
                pathname: null,
                visibleDialogSearchMore: !1,
                visibleDialogSearch: null,
                selectedDiamond: null,
                selectedSingleDiamond: null,
                similarDiamonds: null,
                query: {
                    count: 0,
                    diamonds: []
                },
                mountended: !1,
                addtobagloading: !1,
                ready: !1,
                firstload: !1,
                advancedOptionsOn: !1,
                singleDiamondView: !1,
                diamondsShapes: window.diamondsShapes,
                displayMode: "list",
                selectedMediaPreview: "image",
                selectedMediaSinglePreview: "image",
                searchParams: {
                    type: "labgrown",
                    selectedShape: [],
                    orderby: "sku",
                    order: "desc",
                    offset: 0,
                    limit: 20,
					lab: ['GCAL','GIA','IGI'],
                },
                is_natural: 'false',
            },
            created: async function() {
                this.loadShopSettings()
            },
            mounted: async function() {
                this.pathname = "/pages/diamondsearch", 
                this.loadSingleDiamond();
                this.loadDiamondType();
                await this.loadAvailableValues();
                this.mountended = !0,
                this.is_natural = this.searchParams.type === 'natural',
                setTimeout(async () => {
                    window.initialiseSlider();
                    try {
                        let e = await this.getShareParams();
						if (e) {
                            if (priceSlider && (priceSlider.noUiSlider.updateOptions({
                                    start: [parseFloat(e.price.min), parseFloat(e.price.max)]
                                }), this.searchParams.price = e.price), caratSlider && (caratSlider.noUiSlider.updateOptions({
                                    start: [parseFloat(e.carat.min), parseFloat(e.carat.max)]
                                }), this.searchParams.carat = e.carat), ratioSlider && (ratioSlider.noUiSlider.updateOptions({
                                    start: [parseFloat(e.ratio.min), parseFloat(e.ratio.max)]
                                }), this.searchParams.ratio = e.ratio), tableSlider && (tableSlider.noUiSlider.updateOptions({
                                    start: [e.table.min, e.table.max]
                                }), this.searchParams.table = e.table), depthSlider && (depthSlider.noUiSlider.updateOptions({
                                    start: [e.depth.min, e.depth.max]
                                }), this.searchParams.depth = e.depth), colorSlider) {
                                let a = _.findIndex(diamondsColours, a => a === _.first(e.colors)),
                                    t = _.findIndex(diamondsColours, a => a === _.last(e.colors));
                                colorSlider.noUiSlider.updateOptions({
                                    start: [a, t + 1]
                                }), this.searchParams.colors = e.colors
                            }
                            if (claritySlider) {
                                let i = _.findIndex(diamondsClarity, a => a === _.first(e.clarity)),
                                    s = _.findIndex(diamondsClarity, a => a === _.last(e.clarity));
                                claritySlider.noUiSlider.updateOptions({
                                    start: [i, s + 1]
                                }), this.searchParams.clarity = e.clarity
                            }
                            if (cutSlider) {
                                let l = _.findIndex(diamondsCut, a => a.value === _.first(e.cut)),
                                    r = _.findIndex(diamondsCut, a => a.value === _.last(e.cut));
                                cutSlider.noUiSlider.updateOptions({
                                    start: [l, r + 1]
                                }), this.searchParams.cut = e.cut
                            }
                            if (polishSlider) {
                                let n = _.findIndex(diamondsPolish, a => a.value === _.first(e.polish)),
                                    d = _.findIndex(diamondsPolish, a => a.value === _.last(e.polish));
                                polishSlider.noUiSlider.updateOptions({
                                    start: [n, d + 1]
                                }), this.searchParams.polish = e.polish
                            }
                            if (symmetrySlider) {
                                let o = _.findIndex(diamondsSymmetry, a => a.value === _.first(e.symmetry)),
                                    h = _.findIndex(diamondsSymmetry, a => a.value === _.last(e.symmetry));
                                symmetrySlider.noUiSlider.updateOptions({
                                    start: [o, h + 1]
                                }), this.searchParams.symmetry = e.symmetry
                            }
							if(e.selectedShape) {
								console.log(e.selectedShape);
								this.searchParams.selectedShape = e.selectedShape;
							}
                        }

                        const _pathName = window.location.pathname.split('/');
                        if(_pathName.includes('round-cut')) this.searchParams.selectedShape = ["RD"];
                        if(_pathName.includes('oval-cut')) this.searchParams.selectedShape = ["OV"];
                        if(_pathName.includes('cushion-cut')) this.searchParams.selectedShape = ["CU"];
                        if(_pathName.includes('princess-cut')) this.searchParams.selectedShape = ["PR"];
                        if(_pathName.includes('pear-cut')) this.searchParams.selectedShape = ["PS"];
                        if(_pathName.includes('emerald-cut')) this.searchParams.selectedShape = ["EM"];
                        if(_pathName.includes('marquise-cut')) this.searchParams.selectedShape = ["MQ"];
                        if(_pathName.includes('asscher-cut')) this.searchParams.selectedShape = ["AS"];
                        if(_pathName.includes('radiant-cut')) this.searchParams.selectedShape = ["RT"];
                        if(_pathName.includes('heart-cut')) this.searchParams.selectedShape = ["HRT"];

                    } catch (c) {
                        console.warn(c)
                    }
                    this.updateSearch(!0)
                }, 50)
            },
            updated: async function() {},
            methods: {
				maxPriceChange: _.debounce(function($event){
					try {
						const maxPrice = Number($event.target.value.replaceAll('$','').replaceAll(',',''));
						priceSlider.noUiSlider.set([parseFloat(this.searchParams.price.min),parseFloat(maxPrice)]);
                        this.searchParams.price.max = parseFloat(maxPrice);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
				minPriceChange: _.debounce(function($event){
					try {
						const minPrice = Number($event.target.value.replaceAll('$','').replaceAll(',',''));
						priceSlider.noUiSlider.set([parseFloat(minPrice), parseFloat(this.searchParams.price.max)]);
                        this.searchParams.price.min = parseFloat(minPrice);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
				maxCaratChange: _.debounce(function($event){
					try {
						const maxCarat = Number($event.target.value.replaceAll('ct','').replaceAll(',',''));
						caratSlider.noUiSlider.set([parseFloat(this.searchParams.carat.min),parseFloat(maxCarat)]);
                        this.searchParams.carat.max = parseFloat(maxCarat);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
				minCaratChange: _.debounce(function($event){
					try {
						const minCarat = Number($event.target.value.replaceAll('ct','').replaceAll(',',''));
                        console.log(minCarat)
						caratSlider.noUiSlider.set([parseFloat(minCarat), parseFloat(this.searchParams.carat.max)]);
                        this.searchParams.carat.min = parseFloat(minCarat);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
				maxTableChange: _.debounce(function($event){
					try {
						const maxTable = Number($event.target.value.replaceAll('%','').replaceAll(',',''));
						tableSlider.noUiSlider.set([parseFloat(this.searchParams.table.min),parseFloat(maxTable)]);
                        this.searchParams.table.max = parseFloat(maxTable);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
				minTableChange: _.debounce(function($event){
					try {
						const minTable = Number($event.target.value.replaceAll('%','').replaceAll(',',''));
						tableSlider.noUiSlider.set([parseFloat(minTable), parseFloat(this.searchParams.table.max)]);
                        this.searchParams.table.min = parseFloat(minTable);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
				maxDepthChange: _.debounce(function($event){
					try {
						const maxDepth = Number($event.target.value.replaceAll('%','').replaceAll(',',''));
						depthSlider.noUiSlider.set([parseFloat(this.searchParams.depth.min),parseFloat(maxDepth)]);
                        this.searchParams.depth.max = parseFloat(maxDepth);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
				minDepthChange: _.debounce(function($event){
					try {
						const minDepth = Number($event.target.value.replaceAll('%','').replaceAll(',',''));
						depthSlider.noUiSlider.set([parseFloat(minDepth), parseFloat(this.searchParams.depth.max)]);
                        this.searchParams.depth.min = parseFloat(minDepth);
                        this.updateSearch(!0)
					} catch (error) {
						console.log(error)
					}
				}, 1500),
                loadShopSettings() {
                    fetch(`${window.__evosem_ssurl}/diamond-search/query/store`, {
                        method: "POST",
                        mode: "cors",
                        cache: "no-cache",
                        credentials: "same-origin",
                        headers: {
                            "X-Shopify-Shop": Shopify.shop,
                            "Content-Type": "application/json"
                        }
                    }).then(e => e.json()).then(e => {
                        if (e.status) try {
                            e.shopData.ShopsMeta.FontSize && document.documentElement.style.setProperty("--main-evosem-font-size", `${e.shopData.ShopsMeta.FontSize}px`);
                            let {
                                shapes: a,
                                clarity: t,
                                colors: i,
                                cut: s,
                                lab: l,
                                polish: r,
                                symmetry: n,
                                PrimaryColour: d,
                                PrimaryColourLight: o,
                                PrimaryColourSemiLight: h,
                                PrimaryColourExtraLigh: c
                            } = e.shopData.ShopsMeta, m = JSON.parse(d), p = JSON.parse(o), u = JSON.parse(h), y = JSON.parse(c);
                            m && document.documentElement.style.setProperty("--main-colour", m.hex), p && document.documentElement.style.setProperty("--main-colour-light", p.hex), u && document.documentElement.style.setProperty("--main-colour-semi-light", u.hex), y && document.documentElement.style.setProperty("--main-colour-extra-light", y.hex), a = JSON.parse(a), i = JSON.parse(i), t = JSON.parse(t), s = JSON.parse(s), r = JSON.parse(r), n = JSON.parse(n), l = JSON.parse(l), window.diamondsShapes = this.diamondsShapes = window.diamondsShapes.filter(e => a.includes(e.value)), window.diamondsColours = window.diamondsColours.filter(e => i.includes(e)), window.diamondsClarity = window.diamondsClarity.filter(e => t.includes(e)), window.diamondsLabs = window.diamondsLabs.filter(e => l.includes(e)), window.diamondsCut = window.diamondsCut.filter(e => s.includes(e.value)), window.diamondsPolish = window.diamondsPolish.filter(e => r.includes(e.value)), window.diamondsSymmetry = window.diamondsSymmetry.filter(e => n.includes(e.value))
                        } catch (f) {}
                    }).catch(e => {
                        console.warn(e)
                    })
                },
                dropHintRequestMessageChange() {
                    console.log(this.dropHintRequestMessageChangeModel)
                },
                closeDropBox(e) {
                    this.popboxes[e] = !1, 
                    this.dropHintMessageText = "",
                    this.friendEmailMessageText = "",
                    this.viewingMessageText = "",
                    this.requerstMessageText = ""
                },
                openDropBox(e) {
                    this.popboxes[e] = !0
                },
                shareStone() {
                    if (this.copied) return !1;
                    let e = document.createElement("textarea");
                    return e.value = window.location.href, document.body.appendChild(e), e.select(), document.execCommand("copy"), document.body.removeChild(e), this.copied = !0, setTimeout(() => {
                        this.copied = !1
                    }, 500)
                },
				async addToRing(item) {

					try {

						let diamond = item;
						if (!diamond) diamond = this.selectedDiamond;
						if (!diamond.sku || diamond.price <= 0) return;
						this.addtobagloading = true;

						//Check again before adding it to the ring builder if the diamond still available.
                        const request = await fetch(`${window.__evosem_ssurl}/diamond-search/query`, {
                            method: "POST",
                            mode: "cors",
                            cache: "no-cache",
                            credentials: "same-origin",
                            headers: {
                                "X-Shopify-Shop": Shopify.shop,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                skusearch: item.sku
                            })
                        }).then( response => response.json());

						if (!_.isEmpty(request.diamonds)) {
							const diamondRequested = _.head(request.diamonds);
							diamondRequested.price = Math.round(diamondRequested.price);

							let shop_ring_settings = localStorage.getItem(MainRingBuilderStorageKey);
							try {

								const { shape, carat, color, clarity, sku } = diamondRequested;
								const customUrl = `${carat}-carat-${shape}-cut-${color}-color-${clarity}-clarity-diamond-stock-${sku}`.toLocaleLowerCase().replaceAll('.','-');
                                console.log(diamondRequested);
								diamondRequested.customUrl = customUrl;
								diamondRequested.priceNumber = parseFloat(diamondRequested.price) * 100; //Shopify will calculate based on cents.
                                diamondRequested.shapeLabel = _.head(window.diamondsShapes.filter( shape => shape.value === diamondRequested.shape))?.label;
								shop_ring_settings = !_.isEmpty(shop_ring_settings) ? JSON.parse(shop_ring_settings) : {};
								shop_ring_settings.diamond = diamondRequested;

								this.addtobagloading = false;

								//Save to localstorage								
								const setItemObjection = localStorage.setItem;
								localStorage.setItem = function(key, value) {
									const event = new Event('ringbuilderstoragechange');
									event.value = value; // Optional..
									event.key = key; // Optional..
									document.dispatchEvent(event);
									setItemObjection.apply(this, arguments);
								};
								localStorage.setItem(MainRingBuilderStorageKey, JSON.stringify(shop_ring_settings));
								document.createEvent('Event').initEvent('ringbuilderstoragechange', true, true);
								this.popboxes.diamondAdded = true;
								return setTimeout(() => {
									if(_.isEmpty(shop_ring_settings.ring)) return window.location.replace('/collections/build-an-engagement-ring/');
									window.location.replace('/pages/ringbuilder/');
								},1000)

							} catch ( error ) {
								console.log(error);
								window.alert('Cannot add the chosen diamond please try a different one.')
								return this.addtobagloading = false; // Skip function.
							}
						}

						window.alert('Unable to find the requested diamond please try a different one.')
						return this.addtobagloading = false; // Skip function.


					} catch( error ) {
						window.alert('Something went wrong please try again later.')
						return this.addtobagloading = false;
					}

				},
                async switchToNatural() {

                    if(this.searchParams.type === 'labgrown') {
                        this.searchParams.type = 'natural'
                    } else {
                        this.searchParams.type = 'labgrown'
                    }
                    
                    await this.loadAvailableValues();

                    return this.updateSearch(true)
                },
                addToBag(e) {
                    let a = e;
                    a || (a = this.selectedDiamond), a.sku && !(a.price <= 0) && (this.addtobagloading = !0, fetch(`${window.__evosem_ssurl}/diamond-search/query/addtobag`, {
                        method: "POST",
                        mode: "cors",
                        cache: "no-cache",
                        credentials: "same-origin",
                        headers: {
                            "X-Shopify-Shop": Shopify.shop,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            diamond: a.sku
                        })
                    }).then(e => e.json()).then(e => {
                        this.addtobagloading = !1, e.status && fetch(window.Shopify.routes.root + "cart/add.js", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                items: [{
                                    id: e.product.variants[0].id,
                                    quantity: 1
                                }]
                            })
                        }).then(e => e.json()).then(e => {
                            window.location.replace(`https://${window.Shopify.shop}/cart`)
                        }).catch(e => {
                            console.warn(e)
                        })
                    }).catch(e => {
                        console.warn(e)
                    }))
                },
                async loadAvailableValues(){
                    this.ready = false;
                    let e = await fetch(`${window.__evosem_ssurl}/diamond-search/query/availablevalues`, {
                        method: "POST",
                        mode: "cors",
                        cache: "no-cache",
                        credentials: "same-origin",
                        headers: {
                            "X-Shopify-Shop": Shopify.shop,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            type: this.searchParams.type,
                        })
                    }).then(e => e.json());
                    if (e.status) {
                        let {
                            availableValues: a
                        } = e;
                        window.__price.min = a.price.min, 
                        window.__price.max = a.price.max, 
                        window.__carat.min = a.carat.min, 
                        window.__carat.max = a.carat.max;

                        window.priceSlider && (window.priceSlider.noUiSlider.updateOptions({ 
                            range: {
                                min: parseFloat(window.__price.min),
                                max: parseFloat(window.__price.max),
                            },
                            start: [parseFloat(window.__price.min), parseFloat(window.__price.max)], 
                        })),
                        window.caratSlider && (window.caratSlider.noUiSlider.updateOptions({ 
                            range: {
                                min: parseFloat(window.__carat.min),
                                max: parseFloat(window.__carat.max),
                            },
                            start: [parseFloat(window.__carat.min), parseFloat(window.__carat.max)], 
                        }))
                    }

                    return this.ready = true;;

                },
                loadDiamondType() {
                    let e = window.location.pathname.split("/");
                    if(e.includes('natural')){
                        this.searchParams.type = 'natural';
                    } else if(e.includes('labgrown')) {
                        this.searchParams.type = 'labgrown';
                    }

                    return this.updateSearch(true);

                },
                loadSingleDiamond() {
                    try {
                        let e = window.location.pathname.split("-"),
                            a = _.findIndex(window.location.pathname.split("-"), e => "stock" === e);
                            console.log(a);
                        if (a && -1 !== a) {
                            let t = e[a + 1];
                            fetch(`${window.__evosem_ssurl}/diamond-search/query`, {
                                method: "POST",
                                mode: "cors",
                                cache: "no-cache",
                                credentials: "same-origin",
                                headers: {
                                    "X-Shopify-Shop": Shopify.shop,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    skusearch: t
                                })
                            })
                            .then(e => e.json())
                            .then(e => {
                                let {
                                    diamonds: a,
                                    count: t,
                                    status: i
                                } = e;
                                i && (a = a.map(e => {
                                    let a = __shapes.filter(a => a.value === e.shape),
                                        t = __shapes.filter(a => a.value === e.polish),
                                        i = __shapes.filter(a => a.value === e.symmetry),
                                        s = __shapes.filter(a => a.value === e.cut);
                                    return _.isUndefined(a[0]) || _.isUndefined(a[0].label) || (e.shape = a[0].label), _.isUndefined(t[0]) || _.isUndefined(t[0].label) || (e.polish = t[0].label), _.isUndefined(i[0]) || _.isUndefined(i[0].label) || (e.symmetry = i[0].label), _.isUndefined(s[0]) || _.isUndefined(s[0].label) || (e.cut = s[0].label), e
                                }), _.isEmpty(_.head(a)) || this.openDiamondSingleView(_.head(a), !1))
                            }).catch(e => {
                                console.warn(e)
                            })
                        }
                    } catch (i) {
                        console.warn(i)
                    }
                },
                showDialogSearchMore() {
                    this.visibleDialogSearchMore = !this.visibleDialogSearchMore
                },
                showDialogSearch(e) {
                    return (document.body.classList.add("__evosem_overflow-hidden"), this.visibleDialogSearch === e) ? this.closeDialogSearch() : (this.visibleDialogSearch = null, this.visibleDialogSearch = e)
                },
                closeDialogSearch() {
                    return document.body.classList.remove("__evosem_overflow-hidden"), this.visibleDialogSearch = null
                },
                getCutName(e) {
                    let a = diamondsCut.filter(a => a.value === e);
                    return _.isEmpty(a) ? e : a[0].label
                },
                getPolishName(e) {
                    let a = diamondsPolish.filter(a => a.value === e);
                    return _.isEmpty(a) ? e : a[0].label
                },
                getSymmetryName(e) {
                    let a = diamondsSymmetry.filter(a => a.value === e);
                    return _.isEmpty(a) ? e : a[0].label
                },
                selectDiamond(e) {
                    this.selectedMediaPreview = 'image';
                    this.selectedMediaSinglePreview = 'image';
                    return this.selectedDiamond = e
                },
                openDiamondSingleView(e, a = !0) {
                    e && (this.selectedSingleDiamond = e), window.scrollTo({
                        top: 0
                    }), this.singleDiamondView = !0, this.selectedMediaPreview = "image", this.similarDiamonds = null, this.loadSimilarDiamonds();
                    try {
                        let {
                            carat: t,
                            cut: i,
                            color: s,
                            clarity: l,
                            sku: r
                        } = this.selectedSingleDiamond;
                        this.selectedSingleDiamond.price = Math.round(this.selectedSingleDiamond.price);
                        _.isEmpty(window.diamondsCut.filter(e => e.value === i)) || (i = _.head(window.diamondsCut.filter(e => e.value === i)).value);
                        let n = `${t}-carat-${i}-cut-${s}-color-${l}-clarity-diamond-stock-${r}`.toLocaleLowerCase().replaceAll('.','-');
                        a && window.history.pushState(!1, !1, `${this.pathname}/${n}`)
                    } catch (d) {
                        console.warn(d)
                    }
                },
                closeDiamondSingleView() {
                    window.history.pushState(!1, !1, `${this.pathname}`), this.singleDiamondView = !1, this.selectedSingleDiamond = null, this.selectedMediaSinglePreview = "image", this.similarDiamonds = null
                },
                updateLabCerts(e) {

					if(this.searchParams.lab.includes(e)) {
						this.searchParams.lab = this.searchParams.lab.filter( lab => lab !== e);
					} else {
						this.searchParams.lab = [...this.searchParams.lab, e];
					}

					this.resetOffset()
					this.updateSearch(true);
                },
                skuSearchInput() {
                    this.resetOffset(), this.updateSearch(!0)
                },
                switchMediaPreview(e) {
                    this.selectedMediaPreview = e
                },
                switchMediaSinglePreview(e) {
                    this.selectedMediaSinglePreview = e
                },
                switchViewMode(e) {
                    this.displayMode = e
                },
                toggleAdvancedFilter() {
                    this.advancedOptionsOn = !this.advancedOptionsOn
                },
                resetOffset() {
                    this.searchParams.offset = 0
                },
                switchOrder(e) {
                    return e === this.searchParams.orderby && (this.searchParams.order = "desc" === this.searchParams.order ? "asc" : "desc"), this.searchParams.orderby = e, this.resetOffset(), this.updateSearch(!0)
                },
                loadMoreDiamonds() {
                    this.searchParams.offset = this.searchParams.offset + 1, this.updateSearch(!1)
                },
                updateSearch: _.debounce(function(e = !1) {
                    try {
                        this.ready = !1;
                        let a = this.searchParams;
                        fetch(`${window.__evosem_ssurl}/diamond-search/query`, {
                            method: "POST",
                            mode: "cors",
                            cache: "no-cache",
                            credentials: "same-origin",
                            headers: {
                                "X-Shopify-Shop": Shopify.shop,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(a)
                        }).then(e => e.json()).then(a => {
                            let {
                                status: t,
                                diamonds: i,
                                count: s
                            } = a;
                            if (!t) {
                                this.query.diamonds = [], this.query.count = '...', this.firstload = !0, this.ready = !0, this.selectedDiamond = null;
                                return
                            }
                            t && (i = i.map(e => {
                                let a = __shapes.filter(a => a.value === e.shape),
                                    t = __shapes.filter(a => a.value === e.polish),
                                    i = __shapes.filter(a => a.value === e.symmetry),
                                    s = __shapes.filter(a => a.value === e.cut);
                                return _.isUndefined(a[0]) || _.isUndefined(a[0].label) || (e.shape = a[0].label), _.isUndefined(t[0]) || _.isUndefined(t[0].label) || (e.polish = t[0].label), _.isUndefined(i[0]) || _.isUndefined(i[0].label) || (e.symmetry = i[0].label), _.isUndefined(s[0]) || _.isUndefined(s[0].label) || (e.cut = s[0].label), e
                            }), 
                            e ? this.query.diamonds = i : this.query.diamonds = [...this.query.diamonds, ...i], 
                            this.query.diamonds = this.query.diamonds.map( diamond => {
                                diamond.price = Math.round(diamond.price)
                                return diamond;
                            }),
                            this.query.count = '...',
                            this.firstload = !0, 
                            this.ready = !0, 
                            this.selectedDiamond = null, 
                            !_.isUndefined(this.query.diamonds) && this.query.diamonds.length && this.selectDiamond(this.query.diamonds[0]))

                            console.clear()
                            console.log('Load the counting......')
                            fetch(`${window.__evosem_ssurl}/diamond-search/query/count`, {
                                method: "POST",
                                mode: "cors",
                                cache: "no-cache",
                                credentials: "same-origin",
                                headers: {
                                    "X-Shopify-Shop": Shopify.shop,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(this.searchParams)
                            }).then(response => response.json()).then(response => {
                                if(response.status) {
                                    this.query.count = response.count
                                }
                            })

                        }).catch(e => {
                            console.warn(e), this.ready = !0
                        })
                    } catch (t) {
                        console.warn(t)
                    }
                }, 400),
                loadSimilarDiamonds() {
                    let {
                        sku: e,
                        shape: a,
                        cut: t,
                        carat: i,
                        polish: s,
                        symmetry: l,
                        price: r
                    } = this.selectedSingleDiamond, n = window.__shapes.filter(e => e.label === a);
                    a = _.isEmpty(n) ? "all" : n[0].value, fetch(`${window.__evosem_ssurl}/diamond-search/query`, {
                        method: "POST",
                        mode: "cors",
                        cache: "no-cache",
                        credentials: "same-origin",
                        headers: {
                            "X-Shopify-Shop": Shopify.shop,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            selectedShape: [a],
                            cut: [t],
                            polish: [s],
                            symmetry: [l]
                        })
                    }).then(e => e.json()).then(e => {
                        _.isEmpty(e.diamonds) || (e.diamonds = e.diamonds.filter(e => e.sku !== this.selectedSingleDiamond.sku), _.isEmpty(e.diamonds) || (e.diamonds = e.diamonds.map(e => {
                            let a = __shapes.filter(a => a.value === e.shape),
                                t = __shapes.filter(a => a.value === e.polish),
                                i = __shapes.filter(a => a.value === e.symmetry),
                                s = __shapes.filter(a => a.value === e.cut);
                            return _.isUndefined(a[0]) || _.isUndefined(a[0].label) || (e.shape = a[0].label), _.isUndefined(t[0]) || _.isUndefined(t[0].label) || (e.polish = t[0].label), _.isUndefined(i[0]) || _.isUndefined(i[0].label) || (e.symmetry = i[0].label), _.isUndefined(s[0]) || _.isUndefined(s[0].label) || (e.cut = s[0].label), e
                        }), 
                        e.diamonds = e.diamonds.map( diamond => {
                            diamond.price = Math.round(diamond.price)
                            return diamond
                        }),
                        this.similarDiamonds = _.shuffle(e.diamonds).slice(0, 4)))
                    }).catch(e => {
                        console.warn(e)
                    })
                },
                updateShape(shape) {
                    if(this.searchParams.selectedShape.includes(shape)) {
                        this.searchParams.selectedShape = this.searchParams.selectedShape.filter( s => s !== shape);
                    } else {
                        this.searchParams.selectedShape = [...this.searchParams.selectedShape, shape];
                    }
                    this.updateSearch(!0);
                },
                resetSearch() {
                    this.searchParams.selectedShape = [], 
					priceSlider && (priceSlider.noUiSlider.updateOptions({ start: [parseFloat(__price.min), parseFloat(__price.max)] }),
					this.searchParams.price = __price), 
					caratSlider && (caratSlider.noUiSlider.updateOptions({ start: [parseFloat(__carat.min), parseFloat(__carat.max)] }),
					this.searchParams.carat = __carat), 
					ratioSlider && (ratioSlider.noUiSlider.updateOptions({ start: [parseFloat(0), parseFloat(9)] }), 
					this.searchParams.ratio = { min: 0, max: 9 }), 
					tableSlider && (tableSlider.noUiSlider.updateOptions({ start: [parseFloat(0), parseFloat(100)] }), 
					this.searchParams.table = { min: 0, max: 100 }),
					depthSlider && (depthSlider.noUiSlider.updateOptions({ start: [parseFloat(0), parseFloat(100)] }),
					this.searchParams.depth = { min: 0, max: 100 }), 
					colorSlider && (colorSlider.noUiSlider.updateOptions({ start: [0, diamondsColours.length] }), 
					this.searchParams.colors = diamondsColours), 
					claritySlider && (claritySlider.noUiSlider.updateOptions({ start: [0, diamondsClarity.length] }), 
					this.searchParams.clarity = diamondsClarity), 
					cutSlider && (cutSlider.noUiSlider.updateOptions({ start: [0, diamondsCut.length] }), 
					this.searchParams.cut = diamondsCut.map(e => e.value)), 
					polishSlider && (polishSlider.noUiSlider.updateOptions({ start: [0, diamondsPolish.length] }), 
					this.searchParams.polish = diamondsPolish.map(e => e.value)), 
					symmetrySlider && (symmetrySlider.noUiSlider.updateOptions({ start: [0, diamondsSymmetry.length] }), 
					this.searchParams.symmetry = diamondsSymmetry.map(e => e.value)), 
					
                    this.searchParams.skusearch = null,
					this.searchParams.lab = ['GCAL','GIA','IGI'],
					this.updateSearch(true)
                },
                shareYourSearch() {
                    try {
                        let e = JSON.stringify(this.searchParams),
                            a = btoa(e);
                        fetch(`${window.__evosem_ssurl}/diamond-search/query/share/search`, {
                            method: "POST",
                            mode: "cors",
                            cache: "no-cache",
                            credentials: "same-origin",
                            headers: {
                                "X-Shopify-Shop": Shopify.shop,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                search: a
                            })
                        }).then(e => e.json()).then(e => {
                            if (e.status) {
                                if (this.copied) return !1;
                                let a = document.createElement("textarea");
                                return a.value = `${window.location.origin+window.location.pathname}/#params=${e.uniqueId}`.replace("//#", "#"), document.body.appendChild(a), a.select(), document.execCommand("copy"), document.body.removeChild(a), this.copied = !0, setTimeout(() => {
                                    this.copied = !1
                                }, 500)
                            }
                        }).catch(e => {
                            console.warn(e)
                        })
                    } catch (t) {
                        console.warn(t)
                    }
                },
                getShareParams: async function() {
                    try {
                        if (!_.isUndefined(window.location.hash.split("#params=")[1])) {
                            let e = window.location.hash.split("#params=")[1],
                                a = await fetch(`${window.__evosem_ssurl}/diamond-search/query/share/search/load`, {
                                    method: "POST",
                                    mode: "cors",
                                    cache: "no-cache",
                                    credentials: "same-origin",
                                    headers: {
                                        "X-Shopify-Shop": Shopify.shop,
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        shareID: e
                                    })
                                }).then(e => e.json()).then(e => {
                                    if (e.status) {
                                        let a = e.sharedParam;
                                        return a = JSON.parse(atob(a))
                                    }
                                    return !1
                                }).catch(e => (console.warn(e), !1));
                            return a
                        }
                        return !1
                    } catch (t) {
                        return !1
                    }
                },
                printDiamond() {
                    var e = document.getElementById("_evosem-print-version"),
                        a = window.open("", "", "toolbar=0,scrollbars=0,status=0");
                    a.document.write(e.innerHTML), a.document.close(), a.focus(), a.print()
                },
                submitDropHint: async function(e) {
                    e.preventDefault();
                    let {
                        dropHintEmail1: a,
                        dropHintEmail2: t,
                        dropHintFullName: i,
                        dropHintEmail3: s,
                        dropHintMessage: l
                    } = this.$refs, r = [];
                    if (!this.sendingDropHint) {
                        if (_.isEmpty(a.value) && r.push("Friend's Email Address is required"), _.isEmpty(s.value) && r.push("Your Email Address is required"), _.isEmpty(l.value) && r.push("Message is required"), !_.isEmpty(r)) return console.warn(r);
                        this.sendingDropHint = !0, fetch(`${window.__evosem_ssurl}/diamond-search/query/drophint`, {
                            method: "POST",
                            mode: "cors",
                            cache: "no-cache",
                            credentials: "same-origin",
                            headers: {
                                "X-Shopify-Shop": Shopify.shop,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                name: i.value,
                                email: a.value,
                                email1: t.value,
                                email2: s.value,
                                message: l.value,
                                diamond: this.selectedSingleDiamond.sku
                            })
                        }).then(e => e.json()).then(e => {
                            this.sendingDropHint = !1, this.closeDropBox("drophint")
                        }).catch(e => {
                            console.warn(e)
                        })
                    }
                },
                submitEmailFriend: async function(e) {
                    e.preventDefault();
                    let {
                        friendEmailYourName: a,
                        friendEmail1: t,
                        friendEmail2: i,
                        friendEmailMessage: s
                    } = this.$refs, l = [];
                    if (!this.sendingFriendEmail) {
                        if (_.isEmpty(a.value) && l.push("Your Name is required"), _.isEmpty(t.value) && l.push("Your Email Address is required"), _.isEmpty(i.value) && l.push("Your Friend's Email Address is required"), _.isEmpty(s.value) && l.push("Message is required"), !_.isEmpty(l)) return console.warn(l);
                        this.sendingFriendEmail = !0, fetch(`${window.__evosem_ssurl}/diamond-search/query/emailfriend`, {
                            method: "POST",
                            mode: "cors",
                            cache: "no-cache",
                            credentials: "same-origin",
                            headers: {
                                "X-Shopify-Shop": Shopify.shop,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                name: a.value,
                                email: t.value,
                                email1: i.value,
                                message: s.value,
                                diamond: this.selectedSingleDiamond.sku
                            })
                        }).then(e => e.json()).then(e => {
                            this.sendingFriendEmail = !1, this.closeDropBox("emailfriend")
                        }).catch(e => {
                            console.warn(e)
                        })
                    }
                },
                submitRequestMoreInfo: async function(e) {
                    e.preventDefault();
                    let {
                        requestEmail: a,
                        requestPhoneNumber: t,
                        requestMessage: i
                    } = this.$refs, errors = [];

                    if(this.sendingRequestMore) return;

                    if (_.isEmpty(a.value)) errors.push("Your Email Address is required")
                    if (_.isEmpty(t.value)) errors.push("Your Phone Number is required")
                    if (_.isEmpty(i.value)) errors.push("Your Message is required")
                    if(!_.isEmpty(errors)) return window.alert(errors);

                    this.sendingRequestMore = !0, 
                    fetch(`${window.__evosem_ssurl}/diamond-search/query/requestmoreinfo`, {
                        method: "POST",
                        mode: "cors",
                        cache: "no-cache",
                        credentials: "same-origin",
                        headers: {
                            "X-Shopify-Shop": Shopify.shop,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: a.value,
                            phone: t.value,
                            message: i.value,
                            diamond: this.selectedSingleDiamond.sku
                        })
                    }).then(e => e.json()).then(e => {
                        this.sendingRequestMore = !1, 
                        this.closeDropBox("moreinfo")
                    }).catch(e => {
                        console.warn(e)
                    });
                },
                submitScheduleView: async function(e) {
                    e.preventDefault();
                    let {
                        viewingEmail: a,
                        viewingPhoneNumber: t,
                        viewingMM: i,
                        viewingDD: s,
                        viewingYear: l,
                        viewingTime: r,
                        viewingMessage: n
                    } = this.$refs, d = [];
                    if (!this.sendingScheduleRequest) {
                        if (_.isEmpty(a.value) && d.push("Your email address is required"), _.isEmpty(t.value) && d.push("Your phone number is required"), _.isEmpty(i.value) && d.push("Please select a month"), _.isEmpty(s.value) && d.push("Please select a day"), _.isEmpty(l.value) && d.push("Please select a year"), _.isEmpty(r.value) && d.push("Please select time"), _.isEmpty(n.value) && d.push("Message is required"), !_.isEmpty(d)) return console.warn(d);
                        this.sendingScheduleRequest = !0, fetch(`${window.__evosem_ssurl}/diamond-search/query/scheduleview`, {
                            method: "POST",
                            mode: "cors",
                            cache: "no-cache",
                            credentials: "same-origin",
                            headers: {
                                "X-Shopify-Shop": Shopify.shop,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                email: a.value,
                                phone: t.value,
                                month: i.value,
                                day: s.value,
                                year: l.value,
                                time: r.value,
                                message: n.value,
                                diamond: this.selectedSingleDiamond.sku
                            })
                        }).then(e => e.json()).then(e => {
                            viewingMessageText = null, this.sendingScheduleRequest = !1, this.closeDropBox("scheduleview")
                        }).catch(e => {
                            console.warn(e)
                        })
                    }
                }
            }
        });
        window.searchView = a, window.parentsUntil = (e = null, a = null) => {
            let t = !0,
                i = e;
            do {
                if (null === (i = i.parentElement)) return !1;
                if (i.classList.contains(a)) return t = !1, i
            } while (t)
        }, window.initialiseSlider = () => {
            let e = document.getElementById("price-slider");
            if (e) {
                noUiSlider.create(e, {
                    range: {
                        min: Number(__price.min),
                        max: Number(__price.max)
                    },
                    start: [Number(__price.min), Number(__price.max)],
                    connect: !0,
                    tooltips: [wNumb({
                        thousand: ",",
                        decimals: 0,
                        prefix: currentCurrencySymbol
                    }), wNumb({
                        thousand: ",",
                        decimals: 0,
                        prefix: currentCurrencySymbol
                    })]
                });
                let t = e.noUiSlider.get(!0);
                t && (a.searchParams.price = {
                    min: t[0],
                    max: t[1]
                }), e.noUiSlider.on("update", (a, t) => {
                    let i = wNumb({
                            thousand: ",",
                            decimals: 0,
                            prefix: currentCurrencySymbol
                        }),
                        s = parentsUntil(e, "filter-inner");
                    if (!s) return !1;
                    s.querySelector("#display-price-slide-from") && (s.querySelector("#display-price-slide-from").value = i.to(parseFloat(a[0]))), s.querySelector("#display-price-slide-to") && (s.querySelector("#display-price-slide-to").value = i.to(parseFloat(a[1])))
                }), e.noUiSlider.on("end", (e, t) => {
                    a.searchParams.price = {
                        min: e[0],
                        max: e[1]
                    }, a.resetOffset(), a.updateSearch(!0)
                })
            }
            let i = document.getElementById("carat-slider");
            if (i) {
                noUiSlider.create(i, {
                    range: {
                        min: parseFloat(__carat.min),
                        max: parseFloat(__carat.max)
                    },
                    start: [parseFloat(__carat.min), parseFloat(__carat.max)],
                    connect: !0,
                    tooltips: [wNumb({
                        thousand: ",",
                        decimals: 2,
                        suffix: "ct"
                    }), wNumb({
                        thousand: ",",
                        decimals: 2,
                        suffix: "ct"
                    })]
                });
                let s = i.noUiSlider.get(!0);
                s && (a.searchParams.carat = {
                    min: s[0],
                    max: s[1]
                }), i.noUiSlider.on("update", (e, a) => {
                    let t = wNumb({
                            thousand: ",",
                            decimals: 2,
                            suffix: "ct"
                        }),
                        s = parentsUntil(i, "filter-inner");
                    if (!s) return !1;
                    s.querySelector("#display-carat-slide-from") && (s.querySelector("#display-carat-slide-from").value = t.to(parseFloat(e[0]))), s.querySelector("#display-carat-slide-to") && (s.querySelector("#display-carat-slide-to").value = t.to(parseFloat(e[1])))
                }), i.noUiSlider.on("end", (e, t) => {
                    a.searchParams.carat = {
                        min: parseFloat(e[0]),
                        max: parseFloat(e[1])
                    }, a.resetOffset(), a.updateSearch(!0)
                })
            }
            let l = document.getElementById("ratio-slider");
            if (l) {
                noUiSlider.create(l, {
                    range: {
                        min: parseFloat(0),
                        max: parseFloat(9)
                    },
                    start: [parseFloat(0), parseFloat(9)],
                    connect: !0,
                    tooltips: [!0, !0]
                });
                let r = l.noUiSlider.get(!0);
                r && (a.searchParams.ratio = {
                    min: r[0],
                    max: r[1]
                }), l.noUiSlider.on("update", (e, a) => {
                    let t = wNumb({
                            thousand: ",",
                            decimals: 2
                        }),
                        i = parentsUntil(l, "filter-inner");
                    if (!i) return !1;
                    i.querySelector("#display-ratio-slide-from") && (i.querySelector("#display-ratio-slide-from").value = t.to(parseFloat(e[0]))), i.querySelector("#display-ratio-slide-to") && (i.querySelector("#display-ratio-slide-to").value = t.to(parseFloat(e[1])))
                }), l.noUiSlider.on("end", (e, t) => {
                    a.searchParams.ratio = {
                        min: e[0],
                        max: e[1]
                    }, a.resetOffset(), a.updateSearch(!0)
                })
            }
            let n = document.getElementById("table-slider");
            if (n) {
                noUiSlider.create(n, {
                    range: {
                        min: parseFloat(0),
                        max: parseFloat(100)
                    },
                    start: [parseFloat(0), parseFloat(100)],
                    step: 1,
                    connect: !0,
                    tooltips: [wNumb({
                        thousand: ",",
                        decimals: 0,
                        suffix: "%"
                    }), wNumb({
                        thousand: ",",
                        decimals: 0,
                        suffix: "%"
                    })]
                });
                let d = n.noUiSlider.get(!0);
                d && (a.searchParams.table = {
                    min: d[0],
                    max: d[1]
                }), n.noUiSlider.on("update", (e, a) => {
                    let t = wNumb({
                            thousand: ",",
                            decimals: 0,
                            suffix: "%"
                        }),
                        i = parentsUntil(n, "filter-inner");
                    if (!i) return !1;
                    i.querySelector("#display-table-slide-from") && (i.querySelector("#display-table-slide-from").value = t.to(parseFloat(e[0]))), i.querySelector("#display-table-slide-to") && (i.querySelector("#display-table-slide-to").value = t.to(parseFloat(e[1])))
                }), n.noUiSlider.on("end", (e, t) => {
                    a.searchParams.table = {
                        min: e[0],
                        max: e[1]
                    }, a.resetOffset(), a.updateSearch(!0)
                })
            }
            let o = document.getElementById("depth-slider");
            if (o) {
                noUiSlider.create(o, {
                    range: {
                        min: parseFloat(0),
                        max: parseFloat(100)
                    },
                    start: [parseFloat(0), parseFloat(100)],
                    step: 1,
                    connect: !0,
                    tooltips: [wNumb({
                        thousand: ",",
                        decimals: 0,
                        suffix: "%"
                    }), wNumb({
                        thousand: ",",
                        decimals: 0,
                        suffix: "%"
                    })]
                });
                let h = o.noUiSlider.get(!0);
                h && (a.searchParams.depth = {
                    min: h[0],
                    max: h[1]
                }), o.noUiSlider.on("update", (e, a) => {
                    let t = wNumb({
                            thousand: ",",
                            decimals: 0,
                            suffix: "%"
                        }),
                        i = parentsUntil(o, "filter-inner");
                    if (!i) return !1;
                    i.querySelector("#display-depth-slide-from") && (i.querySelector("#display-depth-slide-from").value = t.to(parseFloat(e[0]))), i.querySelector("#display-depth-slide-to") && (i.querySelector("#display-depth-slide-to").value = t.to(parseFloat(e[1])))
                }), o.noUiSlider.on("end", (e, t) => {
                    a.searchParams.depth = {
                        min: e[0],
                        max: e[1]
                    }, a.resetOffset(), a.updateSearch(!0)
                })
            }
            let c = document.getElementById("color-slider");
            if (c) {
                noUiSlider.create(c, {
                    range: {
                        min: 0,
                        max: diamondsColours.length
                    },
                    start: [0, diamondsColours.length],
                    connect: !0,
                    step: 1
                });
                let m = c.noUiSlider.get(!0);
                m && (a.searchParams.colors = diamondsColours.slice(parseInt(m[0]), parseInt(m[1])));
                let p = parentsUntil(c, "filter-inner").querySelector(".steps-labels");
                if (p) {
                    let u = document.createElement("ul");
                    diamondsColours.map(e => {
                        let a = document.createElement("li");
                        a.innerText = e, a.style.width = `${100/diamondsColours.length}%`;
                        let t = document.createElement("span");
                        return t.classList.add("separation"), a.appendChild(t), u.appendChild(a)
                    }), p.appendChild(u)
                }
                c.noUiSlider.on("end", (e, t) => {
                    a.searchParams.colors = diamondsColours.slice(parseInt(e[0]), parseInt(e[1])), a.resetOffset(), a.updateSearch(!0)
                })
            }
            let y = document.getElementById("clarity-slider");
            if (y) {
                noUiSlider.create(y, {
                    range: {
                        min: 0,
                        max: diamondsClarity.length
                    },
                    start: [0, diamondsClarity.length],
                    connect: !0,
                    step: 1
                });
                let f = y.noUiSlider.get(!0);
                f && (a.searchParams.clarity = diamondsClarity.slice(parseInt(f[0]), parseInt(f[1])));
                let S = parentsUntil(y, "filter-inner").querySelector(".steps-labels");
                if (S) {
                    let $ = document.createElement("ul");
                    diamondsClarity.map(e => {
                        let a = document.createElement("li");
                        a.innerText = e, a.style.width = `${100/diamondsClarity.length}%`;
                        let t = document.createElement("span");
                        return t.classList.add("separation"), a.appendChild(t), $.appendChild(a)
                    }), S.appendChild($)
                }
                y.noUiSlider.on("end", (e, t) => {
                    a.searchParams.clarity = diamondsClarity.slice(parseInt(e[0]), parseInt(e[1])), a.resetOffset(), a.updateSearch(!0)
                })
            }
            let v = document.getElementById("cut-slider");
            if (v) {
                noUiSlider.create(v, {
                    range: {
                        min: 0,
                        max: diamondsCut.length
                    },
                    start: [0, diamondsCut.length],
                    connect: !0,
                    step: 1
                });
                let g = v.noUiSlider.get(!0);
                g && (a.searchParams.cut = diamondsCut.slice(parseInt(g[0]), parseInt(g[1])).map(e => e.value));
                let b = parentsUntil(v, "filter-inner").querySelector(".steps-labels");
                if (b) {
                    let P = document.createElement("ul");
                    diamondsCut.map(e => {
                        let a = document.createElement("li");
                        a.style.width = `${100/diamondsCut.length}%`;
                        let t = document.createElement("span");
                        t.classList.add("separation");
                        let i = document.createElement("span");
                        i.classList.add("label"), i.innerText = e.label;
                        let s = document.createElement("span");
                        return s.classList.add("value"), s.innerText = e.value, a.appendChild(i), a.appendChild(s), a.appendChild(t), P.appendChild(a)
                    }), b.appendChild(P)
                }
                v.noUiSlider.on("end", (e, t) => {
                    a.searchParams.cut = diamondsCut.slice(parseInt(e[0]), parseInt(e[1])).map(e => e.value), a.resetOffset(), a.updateSearch(!0)
                })
            }
            let x = document.getElementById("polish-slider");
            if (x) {
                noUiSlider.create(x, {
                    range: {
                        min: 0,
                        max: diamondsPolish.length
                    },
                    start: [0, diamondsPolish.length],
                    connect: !0,
                    step: 1
                });
                let E = x.noUiSlider.get(!0);
                E && (a.searchParams.polish = diamondsPolish.slice(parseInt(E[0]), parseInt(E[1])).map(e => e.value));
                let U = parentsUntil(x, "filter-inner").querySelector(".steps-labels");
                if (U) {
                    let D = document.createElement("ul");
                    diamondsPolish.map(e => {
                        let a = document.createElement("li");
                        a.style.width = `${100/diamondsPolish.length}%`;
                        let t = document.createElement("span");
                        t.classList.add("separation");
                        let i = document.createElement("span");
                        i.classList.add("label"), i.innerText = e.label;
                        let s = document.createElement("span");
                        return s.classList.add("value"), s.innerText = e.value, a.appendChild(i), a.appendChild(s), a.appendChild(t), D.appendChild(a)
                    }), U.appendChild(D)
                }
                x.noUiSlider.on("end", (e, t) => {
                    a.searchParams.polish = diamondsPolish.slice(parseInt(e[0]), parseInt(e[1])).map(e => e.value), a.resetOffset(), a.updateSearch(!0)
                })
            }
            let q = document.getElementById("symmetry-slider");
            if (q) {
                noUiSlider.create(q, {
                    range: {
                        min: 0,
                        max: diamondsPolish.length
                    },
                    start: [0, diamondsPolish.length],
                    connect: !0,
                    step: 1
                });
                let w = q.noUiSlider.get(!0);
                w && (a.searchParams.symmetry = diamondsSymmetry.slice(parseInt(w[0]), parseInt(w[1])).map(e => e.value));
                let C = parentsUntil(q, "filter-inner").querySelector(".steps-labels");
                if (C) {
                    let O = document.createElement("ul");
                    diamondsSymmetry.map(e => {
                        let a = document.createElement("li");
                        a.style.width = `${100/diamondsSymmetry.length}%`;
                        let t = document.createElement("span");
                        t.classList.add("separation");
                        let i = document.createElement("span");
                        i.classList.add("label"), i.innerText = e.label;
                        let s = document.createElement("span");
                        return s.classList.add("value"), s.innerText = e.value, a.appendChild(i), a.appendChild(s), a.appendChild(t), O.appendChild(a)
                    }), C.appendChild(O)
                }
                q.noUiSlider.on("end", (e, t) => {
                    a.searchParams.symmetry = diamondsSymmetry.slice(parseInt(e[0]), parseInt(e[1])).map(e => e.value), a.resetOffset(), a.updateSearch(!0)
                })
            }
            window.priceSlider = e, window.caratSlider = i, window.ratioSlider = l, window.tableSlider = n, window.depthSlider = o, window.colorSlider = c, window.claritySlider = y, window.cutSlider = v, window.polishSlider = x, window.symmetrySlider = q
        }
    }
});