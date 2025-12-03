import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const pdfGenerator = {
  generateReceipt: (saleData, store, filename) => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297], // Formato extendido para tickets más largos
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPos = 10;
      const lineHeight = 5;

      // Función helper para texto centrado
      const addCenteredText = (text, fontSize = 10) => {
        pdf.setFontSize(fontSize);
        const textWidth = pdf.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        pdf.text(text, x, yPos);
        yPos += lineHeight;
      };

      // Función helper para línea separadora
      const addLine = () => {
        pdf.line(5, yPos, 75, yPos);
        yPos += lineHeight;
      };

      // Encabezado del almacén
      pdf.setFont('helvetica', 'bold');
      addCenteredText(store.storeName || 'Mi Almacén', 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      if (store.address) {
        addCenteredText(store.address, 9);
      }
      if (store.phone) {
        addCenteredText(`Tel: ${store.phone}`, 9);
      }
      if (store.email) {
        addCenteredText(store.email, 8);
      }

      yPos += 2;
      addLine();

      // Info del ticket
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Ticket #${saleData.ticketNumber}`, 5, yPos);
      yPos += lineHeight;
      
      pdf.setFont('helvetica', 'normal');
      const date = new Date(saleData.createdAt);
      pdf.text(`Fecha: ${date.toLocaleDateString('es-AR')}`, 5, yPos);
      yPos += lineHeight;
      pdf.text(`Hora: ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, 5, yPos);
      yPos += lineHeight;

      // Método de pago
      const paymentLabels = {
        efectivo: 'Efectivo',
        transferencia: 'Transferencia',
        tarjeta: 'Tarjeta'
      };
      pdf.text(`Pago: ${paymentLabels[saleData.paymentMethod] || saleData.paymentMethod}`, 5, yPos);
      yPos += lineHeight + 2;

      addLine();

      // Productos
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('PRODUCTOS', 5, yPos);
      yPos += lineHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      saleData.products.forEach(product => {
        // Nombre del producto (puede ocupar múltiples líneas)
        const maxWidth = 70;
        const lines = pdf.splitTextToSize(product.name, maxWidth);
        
        lines.forEach(line => {
          pdf.text(line, 5, yPos);
          yPos += 4;
        });

        // Cantidad x Precio = Subtotal
        const detailText = `  ${product.quantity} x ${product.price.toFixed(2)} = ${product.subtotal.toFixed(2)}`;
        pdf.text(detailText, 5, yPos);
        yPos += lineHeight + 1;
      });

      yPos += 2;
      addLine();

      // Total
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('TOTAL:', 5, yPos);
      pdf.text(`${saleData.total.toFixed(2)}`, 75, yPos, { align: 'right' });
      yPos += lineHeight + 2;

      addLine();

      // Info del cliente (si existe)
      if (saleData.customer?.email) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text('CLIENTE:', 5, yPos);
        yPos += lineHeight;
        
        pdf.text(`Email: ${saleData.customer.email}`, 5, yPos);
        yPos += lineHeight + 2;
        
        addLine();
      }

      // Mensaje final
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      yPos += 2;
      addCenteredText('¡Gracias por su compra!', 10);
      addCenteredText('Vuelva pronto', 9);

      // Generar nombre del archivo si no se proporciona
      const finalFilename = filename || `ticket_${saleData.ticketNumber}_${date.toISOString().split('T')[0]}.pdf`;

      pdf.save(finalFilename);
      
      return {
        success: true,
        filename: finalFilename
      };
    } catch (error) {
      console.error('Error al generar PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
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