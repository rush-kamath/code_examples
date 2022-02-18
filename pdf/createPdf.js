const PDFDocument = require('pdfkit');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const momentTimezone = require('moment-timezone');

let serviceRequest = {"CustomerName":"name","ServiceReport":"abc","ServiceRequest":"123","serviceRequestNumber":"123","TechOnChargeCode":"123","TechOnChargeName":"123","CoordinatedBy":"123","CoordinatorEmail":"emailId","Issued":1602760489000,"ServiceStatus":2,"CompanyCode":"123","createdOn":1604058380399,"technicianDetails":[{"technicianCode":"code","technicianName":"name","inCharge":"Yes"}],"vesselDetails":{"VesselIMO":"imo","VesselName":"name","VesselFlag":"flag","VesselClass":"","Pier":"","AgentName":"name","ETD":1602972000000,"Port":"Jorf Lasfar","Location":1,"ETA":1602712800000},"serviceRequestDetails":{"CustomerName":"name","CustomerOrder":"order number","Subject":"subject","ServiceCategory":1,"ServiceType":"tyoe","ServiceSubType":"sub type","EquipmentCode":"code","EquipmentDescription":"desc","SerialNumber":"","technicalComments":"test1\ntest2\ntest3\n","logisticsComments":"test\ntest\n","coordinationComments":"test\ntest\n.\n********************************************\n"},"serviceReport":{"ServiceReport":"report","EmbarkedDay":1603004400000},"serviceRequestItems":[{"serviceRequestNumber":"number","ItemCode":"code","ItemDescription":"desc","ConsumptionType":2,"QuantityQuoted":1,"QuotationType":"Mandatory","NetPrice":103,"IdConsumption":"id","ConsumptionDate":"2020-10-18","SNUsed":"","SNReplaced":"","Data":"","PaymentType":"","Invoice":""},{"serviceRequestNumber":"number","ItemCode":"code","ItemDescription":"desc","ConsumptionType":2,"QuantityQuoted":1,"QuotationType":"Suggested","NetPrice":95,"IdConsumption":"HDT20A06-005727","ConsumptionDate":"2020-10-18","SNUsed":"","SNReplaced":"","Data":"","PaymentType":"","Invoice":""},]};

function addPageHandler(doc) {
    doc.image('image.png', 10, 40, {width: 300})
        .fontSize(20).font('fonts/arial-black.ttf').fillColor('#132c65')
        .text('Service Report',  50, 50, {align: 'right'})
        .moveTo(0, 85)
        .lineTo(650, 85)
        .lineWidth(2)
        .stroke();
    doc.fontSize(10).fillColor('black');
    currentYCoordinate = 100;
    currentYCoordinate = createSection(doc, sections[0], sectionWidth, sectionXCoordinate, currentYCoordinate, 10, 10);
    currentYCoordinate += spaceBetweenSections;
    return currentYCoordinate;
}

function addText(doc, text, {fontSize = 10, fontColor = 'black', options, x, y}) {
    if(!x) {
        x = doc.x;
    }
    if(!y) {
        y = doc.y;
    }
    doc.fontSize(fontSize);
    let textHeight = doc.heightOfString(declarationText, options);

    if(y + textHeight > MAX_PAGE_SIZE) {
        doc.addPage();
        y = addPageHandler(doc);
    }
    console.log(x, y);
    doc.fontSize(fontSize).fillColor(fontColor).text(text, x, y, options);
    return y + textHeight;
}

function addKeyValue(doc, key, value, x , y) {
    if(!x) {
        x = doc.x;
    }
    if(!y) {
        y = doc.y;
    }
    if(!_.isArray(key)) {
        if(!value || _.isEmpty(value)) {
            value = ' ';
        }
        doc.font('fonts/arial-bold.ttf').text(`${ key}:  `, x, y, {continued: true, width: 400})
            .font('fonts/arial.ttf').text(`${value}`);
        return doc.heightOfString(value);
    }

    let rowHeight = 0;
    for(let i = 0; i < key.length; i++) {
        let valToDisplay = value[i];
        if(!valToDisplay || _.isEmpty(valToDisplay)) {
            valToDisplay = ' ';
        }
        rowHeight = Math.max(rowHeight, doc.heightOfString(valToDisplay));
    }

    for(let i = 0; i < key.length; i++) {
        let valToDisplay = value[i];
        if(!valToDisplay || _.isEmpty(valToDisplay)) {
            valToDisplay = ' ';
        }
        if(i===0) {
            doc.font('fonts/arial-bold.ttf').text(`${ key[i]}:  `, x, y, {continued: true})
                .font('fonts/arial.ttf').text(`${valToDisplay}`, {continued: true})
        } else if ( i === key.length -1) {
            doc.font('fonts/arial-bold.ttf').text(` ${ key[i]}:  `,  {continued: true})
                .font('fonts/arial.ttf').text(`${valToDisplay}`);
        } else {
            doc.font('fonts/arial-bold.ttf').text(` ${ key[i]}:  `,  {continued: true})
                .font('fonts/arial.ttf').text(`${valToDisplay}`, {continued: true});
        }
    }
    return rowHeight;
}

function encloseSectionWithRectangle(doc, x, y, width, height, drawLine = true, partialSectionsNum) {
    doc.lineWidth(1).strokeColor('black').roundedRect(x, y, width, height, 3).stroke();
    if(drawLine && partialSectionsNum > 1) {
        for(let i = 0; i < partialSectionsNum; i++) {
            doc.lineCap('butt').moveTo(width/partialSectionsNum, y).lineTo(width/partialSectionsNum, y + height).stroke();
        }
    }
}

function createSection(doc, sectionData = [], sectionWidth, sectionXLocation, sectionYLocation, textXOffset, textYOffset, drawSectionLine = true, sectionHeight = 20, spaceBetweenSections = 20) {
    doc.fontSize(10).fillColor('black');

    if(currentYCoordinate + sectionHeight + spaceBetweenSections > MAX_PAGE_SIZE) {
        console.log('createSection adding new page', sectionData, currentYCoordinate, sectionWidth, sectionHeight);
        doc.addPage();
        sectionYLocation = addPageHandler(doc);
        console.log(sectionYLocation);
    }

    let eachPartSectionWidth = (sectionWidth / sectionData.length);
    sectionData.forEach((partSectionData = [], partSectionDataIndex) => {
        let captureSectionHeight = (partSectionDataIndex === 0);

        if(!_.isArray(partSectionData)) {
            partSectionData = [partSectionData];
        }

        partSectionData.forEach((row, rowIndex) => {
            let key = row.key;
            let value = row.value;
            let rowHeight = 0;
            if(rowIndex === 0) {
                rowHeight = addKeyValue(doc, key, value, sectionXLocation + textXOffset + (partSectionDataIndex * eachPartSectionWidth), sectionYLocation + textYOffset);
            } else {
                rowHeight = addKeyValue(doc, key, value);
            }

            if(captureSectionHeight) {
                sectionHeight += rowHeight;
            }
        });
    });

    encloseSectionWithRectangle(doc, sectionXLocation, sectionYLocation, sectionWidth, sectionHeight, drawSectionLine, sectionData.length);
    return sectionYLocation + sectionHeight;
}

function computeRowHeight(doc, columnValue, columnWidth, currentRowHeight, rowSpacing) {
    const cellHeight = doc.heightOfString(columnValue, {
        width: columnWidth,
        align: 'left'
    });
    let result = Math.max(currentRowHeight, cellHeight);
    return result + rowSpacing;
}

function addTableHeader(headers, x, y, headerWidth) {
    let previousHeaderWidth = 0;
    let headerKeys = Object.keys(headers) || [];
    headerKeys.forEach(headerKey => {
        let headerObj = headers[headerKey] || {};
        let columnTitle = headerObj.title || headerKey;
        x = x + previousHeaderWidth;
        previousHeaderWidth = headerObj.width || 75;

        doc.lineWidth(1).rect(x, y - 5, previousHeaderWidth, headerWidth)
            .lineWidth(0.5)
            .fillOpacity(1)
            .fillAndStroke("#A0A0A0", "white").stroke();
        doc.fontSize(8).fillColor('#FFFFFF').font('fonts/arial.ttf').text(columnTitle, x + 4, y, {
            width: previousHeaderWidth,
            align: 'left'
        });
    });
    return y + headerWidth;
}

let sections = [
    [
        [
            { key: 'Service request / Customs doc.', value: serviceRequest.ServiceRequest},
            { key: 'Service report', value: serviceRequest.ServiceReport},
            { key: 'Port', value: serviceRequest.vesselDetails.Port},
            { key: 'Customs authorization', value: 'Needs mapping'}
        ],
        [
            { key: 'Vessel', value: serviceRequest.vesselDetails.VesselName},
            { key: 'IMO', value: serviceRequest.vesselDetails.VesselIMO},
            { key: 'Flag', value: serviceRequest.vesselDetails.VesselFlag},
            { key: 'Class', value: serviceRequest.vesselDetails.VesselClass},
        ]
    ],
    [
        [
            { key: 'Customer', value: serviceRequest.CustomerName},
            { key: 'PO', value: 'Needs mapping'},
            { key: ['ETA', 'ETD'], value: [serviceRequest.vesselDetails.ETA, serviceRequest.vesselDetails.ETD]},
            { key: 'Location', value: serviceRequest.vesselDetails.Location,},
            { key: 'Dock', value: 'Needs mapping',}
        ],
        [
            { key: 'Service type', value: serviceRequest.serviceRequestDetails.ServiceType,},
            { key: 'Service subtype', value: serviceRequest.serviceRequestDetails.ServiceSubType,},
            { key: 'Equipment', value: serviceRequest.serviceRequestDetails.EquipmentDescription,},
            { key: 'S/N', value: serviceRequest.serviceRequestDetails.SerialNumber,},
            { key: 'Technician in charge', value: serviceRequest.TechOnChargeName,},
        ]
    ],
    [
        { key: 'Condition found', value: serviceRequest.serviceReport.ConditionFound},
    ],
    [

        { key: 'Action taken', value1: serviceRequest.serviceReport.ActionTaken, value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sodales neque sed elit varius ultricies a ac nibh. Proin scelerisque volutpat ullamcorper. Cras elementum ligula nec gravida molestie. Nunc ullamcorper massa a facilisis pellentesque. Etiam maximus efficitur turpis, ut vestibulum libero porta eget. Nam nec molestie lectus, vitae cursus ligula. Donec at ligula nulla. Fusce sit amet laoreet nunc. Etiam lorem tellus, tempor et eros quis.\n' +
                '- Vestibulum blandit ante id ligula aliquam, eu finibus augue varius. Proin finibus fringilla eros, sed imperdiet enim faucibus et. Morbi ut libero in risus malesuada porta. Praesent turpis turpis, consectetur tincidunt dignissim quis, facilisis ut odio.\n' +
                '- Aliquam id interdum dolor, et sollicitudin magna. Nullam at velit non nulla cursus tincidunt eget non nulla. Pellentesque tincidunt libero eget enim faucibus, finibus tempus arcu posuere. Integer elementum tincidunt finibus. Curabitur pretium pellentesque felis at lobortis. Ae\n' +
                'isl. Praesent maximus, sem ut finibus luctus, justo libero sagittis eros, et venenatis felis justo pellentesque elit. Suspendisse bibendum orci sapien, vitae tincidunt lacus volutpat eget. Suspendisse quam libero, faucibus at finibus eu, accumsan at velit. Quisque semper a mi'},
    ],
    [
        { key: 'Condition after service', value1: serviceRequest.serviceReport.ConditionAfterService, value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam in suscipit purus. \n\n Vestibulum ante ipsum primis in faucibus orci luctuLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam in suscipit purus. \n\n123Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam in suscipit purus. \n\n Vestibulum ante ipsum primis in faucibus orci luctuLorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam in suscipit purus. \n\n123'},
    ],
    [
        { key: 'Follow-up action', value: serviceRequest.serviceReport.FollowupAction},
    ],
    [
        [{ key: 'Technician', value: serviceRequest.TechOnChargeName},],
        [
            { key: 'Embarked', value: getFormattedMoment(serviceRequest.EmbarkedDay, 'DD/MM/YYYY hh:mm'),},
            { key: 'Disembarked', value: getFormattedMoment(serviceRequest.DisembarkedDay, 'DD/MM/YYYY hh:mm'),},
        ],
        [
            { key: 'Vessel representative', value: ' '},
        ]
    ],
];

function getFormattedMoment(value, format) {
    if(_.isUndefined(value)) {
        return '';
    }
    try {
        let date = moment(value);
        return date.format(format);
    } catch(err) {
        return '';
    }
}

const declarationText = `isl. Praesent maximus, sem ut finibus luctus, justo libero sagittis eros, et venenatis felis justo pellentesque elit. Suspendisse bibendum orci sapien, vitae tincidunt lacus volutpat eget. Suspendisse quam libero, faucibus at finibus eu, accumsan at velit. Quisque semper a mi`;
const disclaimerText = `Morbi ac neque ut mauris placerat venenatis sit amet ut ligula. Curabitur at ipsum mattis, consequat lectus maximus, maximus velit. Nunc semper, dolor at solli.`

let sectionWidth = 575;
let sectionXCoordinate = 10;
let currentYCoordinate = 70;
let spaceBetweenSections = 10;
let MAX_PAGE_SIZE = 690;

// Create a document
const doc = new PDFDocument({autoFirstPage: false, bufferPages: true, });
doc.pipe(fs.createWriteStream('output.pdf'));
doc.on('pageAdded', () => {
    currentYCoordinate = addPageHandler(doc);
});
doc.addPage();

_.forEach(sections, (section, index) => {
    if(index === 0) {
        return true;
    }
    if(index === 6) {
        return true;
    }

    currentYCoordinate = createSection(doc, section, sectionWidth, sectionXCoordinate, currentYCoordinate, 10, 10);
    currentYCoordinate += spaceBetweenSections;
});

function formatConsumptionDate(value, format='YYYY-MM-DD', timezone = 'Europe/Madrid') {
    try {
        let time = momentTimezone.tz(value, format, timezone).valueOf();
        return _.isNaN(time) ? undefined : getFormattedMoment(time, 'DD/MM/YYYY');
    } catch(err) {
        return undefined;
    }
}

const table0 = {
    tableHeaders: {
        ItemCode: {title: 'ITEM', width: 100},
        ItemDescription: {title: 'DESCRIPTION', width: 175},
        QuantityTakenOnBoard: {title: 'QTY. TAKEN ON BOARD', alignValue: 'right', width: 50},
        QuantityQuoted: {title: 'QTY USED', alignValue: 'right', width: 50},
        SNUsed: {title: 'OLD S/N', width: 60, },
        SNReplaced: {title: 'NEW S/N', width: 60, },
        ConsumptionDate: {title: 'DATE', width: 80, columnValueFormatter: formatConsumptionDate },
    },
    tableRows: serviceRequest.serviceRequestItems
};

let headerWidth = 30;
let tableXPosition = sectionXCoordinate;
currentYCoordinate = currentYCoordinate + spaceBetweenSections;
if(currentYCoordinate + headerWidth > MAX_PAGE_SIZE) {
    doc.addPage();
}
currentYCoordinate = addTableHeader(table0.tableHeaders, tableXPosition, currentYCoordinate, headerWidth);

let headerKeys = Object.keys(table0.tableHeaders) || [];
let rowSpacing = 1;
table0.tableRows.forEach((row, rowIndex) => {
    tableXPosition = 10;
    let previousHeaderWidth = 0;
    let currentRowHeight = 0;

    headerKeys.forEach(key => {
        let headerObj = table0.tableHeaders[key] || {};
        previousHeaderWidth = headerObj.width || 75;

        if(!_.isEmpty(headerObj)) {
            let columnValue = row[key] || " ";
            if(headerObj.columnValueFormatter) {
                columnValue = headerObj.columnValueFormatter(columnValue);
            }
            let alignColumn = headerObj.alignValue || 'left';
            let columnValPosition = alignColumn === 'left' ? tableXPosition + 4 : tableXPosition - 4;
            doc.fontSize(8).fillColor('black').font('fonts/arial.ttf').text(columnValue, columnValPosition, currentYCoordinate, {
                width: previousHeaderWidth,
                align: alignColumn
            });

            tableXPosition = tableXPosition + previousHeaderWidth;
            currentRowHeight = computeRowHeight(doc, columnValue, previousHeaderWidth, currentRowHeight, rowSpacing);
        }
    });
    currentYCoordinate += currentRowHeight;
    if(rowIndex < (table0.tableRows.length - 1) && currentYCoordinate > MAX_PAGE_SIZE) {
        doc.addPage();
        currentYCoordinate = addTableHeader(table0.tableHeaders, 10, currentYCoordinate, headerWidth);
    }
});

currentYCoordinate += spaceBetweenSections;
console.log(currentYCoordinate);
currentYCoordinate = addText(doc, declarationText, {fontSize: 8, fontColor: 'black', options: {align: 'left', width: 575}, x: sectionXCoordinate, y: currentYCoordinate});

currentYCoordinate += spaceBetweenSections;
console.log(currentYCoordinate);
currentYCoordinate = createSection(doc, sections[6], sectionWidth, sectionXCoordinate, currentYCoordinate, 10, 10, false, 100);

currentYCoordinate += spaceBetweenSections;
console.log(currentYCoordinate);
currentYCoordinate = addText(doc, disclaimerText, {fontSize: 8, fontColor: 'black', options: {align: 'left', width: 575}, x: sectionXCoordinate, y: currentYCoordinate});

let pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(9).text(`Page: ${i + 1} of ${pages.count}`, 0, doc.page.height - 90, { align: 'right' });
    doc.image('image.png', 10, doc.page.height - 70, {width: 600});
}

// Finalize PDF file
doc.end();
