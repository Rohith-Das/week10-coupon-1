{/* <tr class="summary-subtotal">
                                                <div class="order-summary-details">
                                                    <% 
                                                    const subtotal = cart.items.reduce((total, item) => {
                                                      return total + (item.discountedPrice * item.quantity);
                                                    }, 0).toFixed(2); 
                                                  %>
                                                  <h3><strong>Subtotal:</strong> ₹<%= subtotal %></h3>
	                						</tr><!-- End .summary-subtotal --> */}



        //                       </div>
        //                       <div class="cart-discount">
        //                         <div>
        //                             <button id="viewCouponsBtn" class="btn btn-primary">View Coupons</button>
        //                         </div>
        //                         <div id="couponsModal" class="modal">
        //                             <div class="modal-content">
        //                               <span class="close">&times;</span>
        //                               <h2>Available Coupons</h2>
        //                               <table class="table">
        //                                 <thead>
        //                                   <tr>
        //                                     <th>Code</th>
        //                                     <th>Description</th>
        //                                     <th>Discount (%)</th>
        //                                     <th>Min Amount</th>
        //                                     <th>Max Discount</th>
        //                                     <th>Expiry Date</th>
        //                                   </tr>
        //                                 </thead>
        //                                 <tbody>
        //                                   <% coupons.forEach((coupon) => { %>
        //                                     <tr>
        //                                       <td><%= coupon.code %></td>
        //                                       <td><%= coupon.description %></td>
        //                                       <td><%= coupon.discount %></td>
        //                                       <td><%= coupon.minAmount %></td>
        //                                       <td><%= coupon.maxDiscount %></td>
        //                                       <td><%= new Date(coupon.expiryDate).toLocaleDateString() %></td>
        //                                     </tr>
        //                                   <% }); %>
        //                                 </tbody>
        //                               </table>
        //                             </div>
        //                           </div>
        //                         </div>
        //                     </div>
        //                 </div>
        
        
        
                        
        //             </div>
        //         </div>
        //                           <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        // <script>
        //   // Get the modal
        //   var modal = document.getElementById('couponsModal');
        
        //   // Get the button that opens the modal
        //   var btn = document.getElementById('viewCouponsBtn');
        
        //   // Get the <span> element that closes the modal
        //   var span = document.getElementsByClassName('close')[0];
        
        //   // When the user clicks the button, open the modal 
        //   btn.onclick = function() {
        //     modal.style.display = 'block';
        //   }
        
        //   // When the user clicks on <span> (x), close the modal
        //   span.onclick = function() {
        //     modal.style.display = 'none';
        //   }
        
        //   // When the user clicks anywhere outside of the modal, close it
        //   window.onclick = function(event) {
        //     if (event.target == modal) {
        //       modal.style.display = 'none';
        //     }
        //   }
        // </script>