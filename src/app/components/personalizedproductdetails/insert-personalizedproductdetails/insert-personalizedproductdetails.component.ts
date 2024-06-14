import { Component, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';


import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PersonalizedProductDetail } from '../../../models/personalizedproductdetail';
import { PersonalizedDetail } from '../../../models/personalizeddetail';
import { PersonalizedproductdetailsService } from '../../../services/personalizedproductdetails.service';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';

import { PersonalizedDetailService } from '../../../services/personalized-detail.service';
import { MatCardModule } from '@angular/material/card';
import { Product } from '../../../models/product';
import { ProductsService } from '../../../services/product.service';

@Component({
  selector: 'app-insert-personalizedproductdetails',
  standalone: true,
  imports: [
    MatDividerModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    CommonModule,
    MatSelectModule,
    MatPaginatorModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    RouterLink,
  ],
  templateUrl: './insert-personalizedproductdetails.component.html',
  styleUrl: './insert-personalizedproductdetails.component.css',
})
export class InsertPersonalizedproductdetailsComponent implements OnInit {
  form: FormGroup = new FormGroup({});
  ppd: PersonalizedProductDetail = new PersonalizedProductDetail();
  listPersonalizaciones: PersonalizedDetail[] = [];
  selectedPersonalizado: PersonalizedDetail | null = null;
  nombreProducto: Product | null = null;
  productId: number = 0;
  edicion: boolean = false;
  id: number = 0;
  totalPrice: number = 0; // Agrega esta línea

  constructor(
    private ppdS: PersonalizedproductdetailsService,
    private router: Router,
    private formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private pS: ProductsService,
    private pdS: PersonalizedDetailService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      detallePersonalizado: ['', Validators.required],
      nombreProducto: ['', Validators.required],
    });

    this.pdS.list().subscribe((data) => {
      if (data) {
        this.listPersonalizaciones = data;
      }
    });

    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProductDetails(productId);
    }

    this.route.params.subscribe((data: Params) => {
      this.id = data['id'];
      this.edicion = data['id'] != null;
      if (this.edicion) {
        this.init();
      }
    });
  }

  loadProductDetails(productId: string): void {
    console.log('Cargando detalles del producto con ID:', productId);
    this.pS.listId(Number(productId)).subscribe({
      next: (product) => {
        console.log('Producto recibido:', product);
        if (product) {
          this.nombreProducto = product;
          this.form.patchValue({
            nombreProducto: product.nameProduct || '', // Manejo seguro si nameProduct es undefined
          });
          this.productId = Number(productId);
        } else {
          console.error(
            'El producto obtenido es nulo o no tiene una propiedad nameProduct definida.'
          );
        }
      },
      error: (error) => {
        console.error('Error al cargar los detalles del producto:', error);
      },
    });
  }

  registrar(): void {
    if (this.form.valid) {
      const detallePersonalizadoId =
        this.form.value.detallePersonalizado.idPersonalizedDetail;
      const detallePersonalizadoSeleccionado = this.listPersonalizaciones.find(
        (detalle) => detalle.idPersonalizedDetail === detallePersonalizadoId
      );

      if (detallePersonalizadoSeleccionado && this.nombreProducto) {
        this.ppd.personalizedDetails = detallePersonalizadoSeleccionado;
        this.ppd.products.idProduct = this.productId;

        if (this.edicion) {
          console.log('Modo edición');
          this.ppdS.update(this.ppd).subscribe({
            next: (data) => {
              console.log('Actualización exitosa:', data);
              this.ppdS.list().subscribe({
                next: (data) => this.ppdS.setList(data),
                error: (error) => console.error('Error al listar:', error),
              });
              this.mostrarMensaje(false);
              this.router.navigate([
                '/products/listperzonalizedDetailsProduct',
              ]);
            },
            error: (error) => {
              console.error('Error al actualizar:', error);
              this.mostrarMensaje(true);
            },
          });
        } else {
          console.log('Modo inserción');
          this.ppdS.insert(this.ppd).subscribe({
            next: (data) => {
              console.log('Inserción exitosa:', data);
              this.ppdS.list().subscribe({
                next: (data) => this.ppdS.setList(data),
                error: (error) => console.error('Error al listar:', error),
              });
              this.mostrarMensaje(false);
              this.router.navigate([
                '/products/listperzonalizedDetailsProduct',
              ]);
            },
            error: (error) => {
              console.error('Error al insertar:', error);
              this.mostrarMensaje(true);
            },
          });
        }
      } else {
        console.error(
          'Detalle personalizado o nombre del producto no encontrado'
        );
      }
    } else {
      console.error('Formulario no válido');
      this.mostrarMensaje(true);
    }
  }

  init() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.id = Number(id);
        this.edicion = true;
        this.ppdS.listId(this.id).subscribe({
          next: (data) => {
            console.log('Datos obtenidos para edición:', data);
            if (data.products && data.personalizedDetails) {
              this.loadProductDetails(data.products.idProduct.toString());
              this.selectedPersonalizado = data.personalizedDetails;
              this.ppd = data;

              this.form.patchValue({
                nombreProducto: data.products.nameProduct,
                detallePersonalizado: data.personalizedDetails,
              });
            } else {
              console.error('Datos inválidos para edición:', data);
            }
          },
          error: (error) => {
            console.error('Error al cargar los detalles:', error);
          },
        });
      } else {
        this.edicion = false;
      }
    });
  }

  calculateTotalPrice(): void {
    if (this.selectedPersonalizado && this.nombreProducto) {
      const additionalPrice =
        this.selectedPersonalizado.additionalPricePersonalizedDetail || 0;
      const productPrice = this.nombreProducto.priceProduct || 0;
      this.totalPrice = additionalPrice + productPrice;
    }
  }

  onSelectionChange(value: any) {
    this.selectedPersonalizado = value;
    this.calculateTotalPrice();
  }

  mostrarMensaje(esError: boolean) {
    let mensaje = esError
      ? '¡Ha ocurrido un error!, verificar los datos'
      : '¡Has registrado exitosamente un detalle aun prodcuto!';
    this._snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
    });
  }
}
