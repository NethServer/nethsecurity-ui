import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome' ////
import { faUserSecret } from '@fortawesome/free-solid-svg-icons' ////
import { faAddressBook as fasAddressBook } from '@fortawesome/free-solid-svg-icons' ////
import { faAddressBook as falAddressBook } from '@nethesis/nethesis-light-svg-icons' ////

export async function loadFontAwesome(app: any) {
  app.component('font-awesome-icon', FontAwesomeIcon) ////
  library.add(faUserSecret) ////
  library.add(fasAddressBook) ////
  library.add(falAddressBook) ////
}
