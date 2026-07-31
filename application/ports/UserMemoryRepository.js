export class UserMemoryRepository {
  async getByUserId(_userId) {
    throw new Error('UserMemoryRepository.getByUserId() doit être implémentée.');
  }

  async save(_memory) {
    throw new Error('UserMemoryRepository.save() doit être implémentée.');
  }
}
