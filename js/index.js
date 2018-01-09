let templatePartial = document.getElementById('singleReferenceTemplate');
Handlebars.registerPartial('reference',templatePartial.innerHTML);

let GetPosition = new Promise((resolve,reject) => {
    let currentPosition = [55.75302590638416, 37.62226466137695];

    if (navigator.geolocation){
        navigator.geolocation.getCurrentPosition((position) => {
            currentPosition = [position.coords.latitude, position.coords.longitude];
            resolve(currentPosition);
        }, (error) => {reject(error)})
    } else {
        resolve(currentPosition);
    }
});

GetPosition.then((position) => {
    let config = {
        center: position,
        zoom: 14
    };

    ymaps.ready(init);

    function init() {
        let myMap = new ymaps.Map('map', config),

            BalloonLayout = ymaps.templateLayoutFactory.createClass(
                `<div id="pop-up" class="panel">
                    <div class="panel-heading">
                        <h3 class="panel-title">
                            <span><i class="fa fa-map-marker"></i>{{properties.placemarkData.address|default: address}}</span>
                        </h3>
                        <span><i id="closeButton" class="fa fa-times"></i></span>
                    </div>
                    <div class="panel-body">
                        <ul id="referenceList" class="panel-references">                            
                            {% include options.contentLayout %}                          
                        </ul>
                        <div class="panel-form">
                            <h3>Ваш отзыв</h3>
                            <form action="" name="referencesForm">
                                <input type="text" name="name" placeholder="Ваше имя">
                                <input type="text" name="place" placeholder="Укажите место">
                                <textarea name="text" placeholder="Поделитесь впечатлениями"></textarea>
                                <input id="addButton" type="submit" value="Добавить">
                            </form>
                        </div>
                    </div>
                </div>`,{

                    build(){
                        this.constructor.superclass.build.call(this);

                        let closeButton = document.querySelector('#closeButton'),
                            addButton = document.querySelector('#addButton');

                        addButton.addEventListener('click', this.onAddReference.bind(this));
                        closeButton.addEventListener('click', this.onCloseBtnClick.bind(this));
                    },

                    clear(){
                        let closeButton = document.querySelector('#closeButton'),
                            addButton = document.querySelector('#addButton');

                        addButton.removeEventListener('click', this.onAddReference);
                        closeButton.removeEventListener('click', this.onCloseBtnClick);
                        this.constructor.superclass.clear.call(this);
                    },

                    getShape() {
                        return new ymaps.shape.Rectangle(new ymaps.geometry.pixel.Rectangle([ [0, 0], [380, 530] ]));
                    },

                    onCloseBtnClick(e){
                        this.events.fire('userclose');
                    },

                    onAddReference(e){
                        let name = document.querySelector('input[name=name]'),
                            place = document.querySelector('input[name=place]'),
                            text = document.querySelector('textarea[name=text]'),
                            refList = document.querySelector('#referenceList');

                        e.preventDefault();

                        if (name.value && place.value && text.value){
                            let template = Handlebars.compile(templatePartial.innerHTML),
                                ymapsElem =  refList.firstElementChild.firstElementChild,
                                coords = this.getData().properties? this.getData().properties.getAll().placemarkData.coords : this.getData().coords,
                                address = this.getData().properties? this.getData().properties.getAll().placemarkData.address : this.getData().address,
                                today = new Date(),
                                date, myPlacemark, placemarkData;

                            date = `${today.getFullYear()}.${checkDateContent(today.getMonth() + 1)}.${checkDateContent(today.getDate())} 
                                    ${checkDateContent(today.getHours())}:${checkDateContent(today.getMinutes())}:${checkDateContent(today.getSeconds())}`;

                            placemarkData = {
                                coords: coords,
                                address: address,
                                name: name.value,
                                place: place.value,
                                date: date,
                                reference: text.value
                            };

                            data.push(placemarkData);
                            name.value = place.value = text.value = '';
                            if (ymapsElem.firstElementChild) {
                                ymapsElem.innerHTML += template(placemarkData);
                            } else {
                                ymapsElem.innerHTML = template(placemarkData);
                            }
                            refList.scrollTop = refList.scrollHeight;
                            myPlacemark = this.onCreatePlacemark.call(this,placemarkData);
                            clusterer.add(myPlacemark);
                            myMap.geoObjects.add(clusterer);
                        } else {
                            alert('Заполните поля!');
                        }
                    },

                    onCreatePlacemark(placemarkData) {
                        return new ymaps.Placemark(placemarkData.coords, {
                            placemarkData: placemarkData
                        }, {
                            iconLayout: FontAwesomeLayout,
                            iconShape: {
                                type: 'Rectangle',
                                coordinates: [[0, 0], [26, 40]]
                            },
                            iconOffset: [-10, -40],
                            balloonLayout: BalloonLayout,
                            balloonContentLayout: BalloonContentLayout,
                            balloonPanelMaxMapArea: 0
                        });
                    }
                }
            ),

            BalloonContentLayout = ymaps.templateLayoutFactory.createClass(
                `{% if properties.placemarkData %}
                <li class="refer-item">
                    <span class="name">{{properties.placemarkData.name}},</span>
                    <span class="place">{{properties.placemarkData.place}},</span>
                    <span class="date">{{properties.placemarkData.date}}</span>
                    <div class="refer-text">{{properties.placemarkData.reference}}</div>
                </li>
                {% endif %}
                <!--{% if foundPlacemarks %}
                    {% for refer in foundPlacemarks %}
                         <li class="refer-item">
                            <span class="name">{{refer.name}}</span>
                            <span class="place">{{refer.place}}</span>
                            <span class="date">{{refer.date}}</span>
                            <div class="refer-text">{{refer.reference}}</div>
                        </li>
                    {% endfor %}
                {% endif %}-->
                {% if content %}
                    {{content|raw}}
                {% endif %}`
            ),

            customItemContentLayout = ymaps.templateLayoutFactory.createClass(
                `<div class="cluster-balloon">
                    <h2 class="cluster-balloon-header">{{properties.placemarkData.place}}</h2>
                    <a href="#" id="addressLink">{{properties.placemarkData.address}}</a>
                    <div class="cluster-balloon-body">{{properties.placemarkData.reference}}</div>
                    <div class="cluster-balloon-footer">{{properties.placemarkData.date}}</div>
                </div>`,
                {
                    build(){
                        this.constructor.superclass.build.call(this);
                        let link = document.querySelector('#addressLink');
                        link.addEventListener('click', this.onLinkClick.bind(this))
                    },

                    clear(){
                        let link = document.querySelector('#addressLink');
                        link.removeEventListener('click', this.onLinkClick);
                        this.constructor.superclass.clear.call(this);
                    },

                    onLinkClick(e){
                        let coords = this.getData().properties.getAll().placemarkData.coords,
                            source = document.querySelector("#multiReferenceTemplate").innerHTML,
                            template = Handlebars.compile(source),
                            foundPlacemarks = [];

                        e.preventDefault();
                        foundPlacemarks = data.filter((placemark) => {
                            return (coords[0] === placemark.coords[0] && coords[1] === placemark.coords[1])
                        });
                        myMap.balloon.open(coords,{
                            coords: coords,
                            address: foundPlacemarks[0].address,
                            content: template({list: foundPlacemarks})
                        },{
                            layout: BalloonLayout,
                            contentLayout: BalloonContentLayout
                        });
                        this.events.fire('userclose');
                    }
                }
            ),

            FontAwesomeLayout = ymaps.templateLayoutFactory.createClass(
                '<i class="fa fa-map-marker" id="placemarker"></i>'),

            clusterer = new ymaps.Clusterer({
                preset: 'islands#invertedVioletClusterIcons',
                gridSize: 128,
                clusterDisableClickZoom: true,
                clusterHideIconOnBalloonOpen: true,
                clusterBalloonContentLayout: "cluster#balloonCarousel",
                clusterBalloonCycling: false,
                clusterOpenBalloonOnClick: true,
                clusterBalloonItemContentLayout: customItemContentLayout,
                clusterBalloonPanelMaxMapArea: 0
            }),

            checkDateContent = (source) => {
                return (source < 10)? '0'+ source : source.toString();
            },

            data = [];


        myMap.events.add('click', (e) => {
            let coords = e.get('coords');

            ymaps.geocode(coords).then((res) => {
                let object = res.geoObjects.get(0),
                    address = object.properties.get('text');

                myMap.balloon.open(coords,{
                    coords: coords,
                    address: address,
                    content: 'Отзывов пока нет...'
                },{
                    layout: BalloonLayout,
                    contentLayout: BalloonContentLayout
                });
            });
        });
    }
}).catch((error) => {alert(error.message)});
