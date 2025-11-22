import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const pdfGenerator = {
  generateReceipt: async (saleData, store, filename = 'recibo.pdf') => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200],
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 10;

    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text(store.storeName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(store.address || '', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    pdf.text(store.phone || '', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.line(5, yPos, 75, yPos);
    yPos += 5;

    pdf.setFontSize(9);
    pdf.text(`Ticket #${saleData.ticketNumber}`, 10, yPos);
    yPos += 5;

    const date = new Date(saleData.createdAt);
    pdf.text(date.toLocaleDateString('es-AR'), 10, yPos);
    pdf.text(date.toLocaleTimeString('es-AR'), 40, yPos);
    yPos += 8;

    pdf.line(5, yPos, 75, yPos);
    yPos += 5;

    pdf.setFont(undefined, 'bold');
    pdf.text('Descripción', 10, yPos);
    pdf.text('Cant', 50, yPos);
    pdf.text('Total', 65, yPos);
    yPos += 5;

    pdf.line(5, yPos, 75, yPos);
    yPos += 3;

    pdf.setFont(undefined, 'normal');
    saleData.products.forEach(product => {
      const lines = pdf.splitTextToSize(product.name, 40);
      pdf.text(lines, 10, yPos);
      yPos += lines.length * 3;

      pdf.text(`${product.quantity}x`, 50, yPos - 3);
      pdf.text(`$${product.subtotal.toFixed(2)}`, 65, yPos - 3);
      yPos += 3;
    });

    yPos += 2;
    pdf.line(5, yPos, 75, yPos);
    yPos += 5;

    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(12);
    pdf.text('TOTAL:', 10, yPos);
    pdf.text(`$${saleData.total.toFixed(2)}`, 65, yPos, { align: 'right' });
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    const paymentMethod = saleData.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta/Transferencia';
    pdf.text(`Pago: ${paymentMethod}`, 10, yPos);
    yPos += 8;

    pdf.setFontSize(8);
    pdf.text('Gracias por su compra!', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    pdf.text('Vuelva pronto', pageWidth / 2, yPos, { align: 'center' });

    pdf.save(filename);
    return true;
  },

  generateSalesReport: async (salesData, period, store, filename = 'reporte-ventas.pdf') => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 15;

    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Reporte de Ventas', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text(`${store.storeName} - ${period}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');

    const columns = ['Ticket', 'Fecha', 'Hora', 'Cantidad', 'Total', 'Método'];
    const startX = 15;
    const colWidths = [30, 55, 40, 18, 18, 25, 35];

    let xPos = startX;
    columns.forEach((col, idx) => {
      pdf.text(col, xPos, yPos);
      xPos += colWidths[idx];
    });
    yPos += 5;
    pdf.line(15, yPos, pageWidth - 15, yPos);
    yPos += 3;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);

    let totalIngresos = 0;
    salesData.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const row = [
        sale.ticketNumber,
        date.toLocaleDateString('es-AR'),
        date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        sale.products.length.toString(),
        `$${sale.total.toFixed(2)}`,
        sale.paymentMethod || 'Efectivo',
      ];

      xPos = startX;
      row.forEach((val, idx) => {
        pdf.text(val.toString(), xPos, yPos);
        xPos += colWidths[idx];
      });

      totalIngresos += sale.total;
      yPos += 5;

      if (yPos > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yPos = 15;
      }
    });

    pdf.line(15, yPos, pageWidth - 15, yPos);
    yPos += 5;

    pdf.setFont(undefined, 'bold');
    pdf.text(`TOTAL VENTAS: ${salesData.length}`, 15, yPos);
    yPos += 5;
    pdf.text(`INGRESOS TOTALES: $${totalIngresos.toFixed(2)}`, 15, yPos);
    yPos += 5;
    pdf.text(`TICKET PROMEDIO: $${(totalIngresos / salesData.length).toFixed(2)}`, 15, yPos);

    pdf.save(filename);
    return true;
  },

  generateInventoryReport: async (products, store, filename = 'inventario.pdf') => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 15;

    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Inventario', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text(`${store.storeName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');

    const columns = ['Código', 'Producto', 'Categoría', 'Stock', 'Min.', 'Precio', 'Total'];
    const startX = 12;
    const colWidths = [30, 55, 40, 18, 18, 25, 35];

    let xPos = startX;
    columns.forEach((col, idx) => {
      pdf.text(col, xPos, yPos);
      xPos += colWidths[idx];
    });
    yPos += 5;
    pdf.line(12, yPos, pageWidth - 12, yPos);
    yPos += 3;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);

    let totalValue = 0;
    products.forEach((product) => {
      const row = [
        product.barcode,
        product.name,
        product.category,
        product.stock.toString(),
        product.minStock.toString(),
        `$${product.price}`,
        `$${(product.stock * product.price).toFixed(2)}`,
      ];

      xPos = startX;
      row.forEach((val, idx) => {
        const maxWidth = colWidths[idx] - 2;
        const lines = pdf.splitTextToSize(val.toString(), maxWidth);
        pdf.text(lines, xPos, yPos);
        xPos += colWidths[idx];
      });

      totalValue += product.stock * product.price;
      yPos += 4;

      if (yPos > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yPos = 15;
      }
    });

    pdf.line(12, yPos, pageWidth - 12, yPos);
    yPos += 5;

    pdf.setFont(undefined, 'bold');
    pdf.text(`TOTAL PRODUCTOS: ${products.length}`, 12, yPos);
    yPos += 5;
    pdf.text(`VALOR TOTAL INVENTARIO: $${totalValue.toFixed(2)}`, 12, yPos);

    pdf.save(filename);
    return true;
  },
};